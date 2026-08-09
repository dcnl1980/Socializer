import { createCopyWriter } from "@socializer/ai";
import { createLinkedInActions } from "@socializer/browser";
import { assertCopyOk } from "@socializer/core";
import { createCrmAdapter } from "@socializer/crm";
import {
  actionJobs,
  auditLogs,
  crmSyncLogs,
  emailMessages,
  enrollments,
  leads,
  linkedinSeats,
  type Db,
} from "@socializer/db";
import { createEmailFinder, createEmailSender } from "@socializer/email";
import { eq } from "drizzle-orm";
import { canSpendOutbound, isContentStep } from "../budget.js";
import type { LeaseStore } from "../lease.js";
import { acquireSeatLease, releaseSeatLease } from "../lease.js";
import { processContentJob } from "./content.js";
import { processInboxPoll, processSeatWarm } from "./inbox.js";

export type ProcessLinkedInJobInput = {
  db: Db;
  store: LeaseStore;
  workerId: string;
  actionJobId: string;
};

async function syncCrm(
  db: Db,
  workspaceId: string,
  lead: {
    id: string;
    linkedinUrl: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    company: string | null;
  },
  event: string,
) {
  const crm = createCrmAdapter();
  const result = await crm.syncLead(
    {
      id: lead.id,
      linkedinUrl: lead.linkedinUrl,
      email: lead.email,
      firstName: lead.firstName,
      lastName: lead.lastName,
      company: lead.company,
    },
    event,
  );
  await db.insert(crmSyncLogs).values({
    workspaceId,
    leadId: lead.id,
    event,
    detail: result.detail,
    ok: result.ok,
  });
}

export async function processLinkedInJob(
  input: ProcessLinkedInJobInput,
): Promise<{ status: string; detail: string }> {
  const { db, store, workerId, actionJobId } = input;
  const [job] = await db
    .select()
    .from(actionJobs)
    .where(eq(actionJobs.id, actionJobId))
    .limit(1);
  if (!job) return { status: "failed", detail: "job_not_found" };

  const [seat] = await db
    .select()
    .from(linkedinSeats)
    .where(eq(linkedinSeats.id, job.seatId))
    .limit(1);
  if (!seat) return { status: "failed", detail: "seat_not_found" };

  if (seat.killSwitch || seat.status === "paused" || seat.status === "restricted") {
    await db
      .update(actionJobs)
      .set({ status: "skipped", detail: `seat_${seat.status}`, finishedAt: new Date() })
      .where(eq(actionJobs.id, job.id));
    return { status: "skipped", detail: `seat_${seat.status}` };
  }

  if (isContentStep(job.stepType)) {
    return processContentJob(input);
  }

  if (job.stepType === "inbox_poll") {
    const result = await processInboxPoll({ db, seatId: seat.id });
    await db
      .update(actionJobs)
      .set({
        status: "succeeded",
        detail: `replies:${result.replies}`,
        finishedAt: new Date(),
      })
      .where(eq(actionJobs.id, job.id));
    return { status: "succeeded", detail: `replies:${result.replies}` };
  }

  if (job.stepType === "seat_warm") {
    const password = job.detail ?? "";
    const result = await processSeatWarm({
      db,
      seatId: seat.id,
      password,
    });
    await db
      .update(actionJobs)
      .set({
        status: result.ok ? "succeeded" : "failed",
        detail: result.detail,
        finishedAt: new Date(),
      })
      .where(eq(actionJobs.id, job.id));
    return {
      status: result.ok ? "succeeded" : "failed",
      detail: result.detail,
    };
  }

  if (!canSpendOutbound(seat)) {
    await db
      .update(actionJobs)
      .set({ status: "skipped", detail: "outbound_cap", finishedAt: new Date() })
      .where(eq(actionJobs.id, job.id));
    return { status: "skipped", detail: "outbound_cap" };
  }

  const leased = await acquireSeatLease(store, seat.id, workerId, 60_000);
  if (!leased) {
    return { status: "queued", detail: "lease_busy" };
  }

  await db
    .update(actionJobs)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(actionJobs.id, job.id));

  try {
    const li = createLinkedInActions(seat.browserEngine);
    const writer = createCopyWriter();
    const emailSender = createEmailSender();
    const emailFinder = createEmailFinder();
    let detail = "";
    let prompt: string | null = null;
    let aiOutput: string | null = null;

    const [lead] = job.leadId
      ? await db.select().from(leads).where(eq(leads.id, job.leadId)).limit(1)
      : [undefined];

    const needsLead = ![
      "withdraw_invite",
      "group_engage",
    ].includes(job.stepType);
    if (needsLead && !lead?.linkedinUrl) throw new Error("lead_missing");

    const leadCtx = {
      firstName: lead?.firstName ?? "there",
      title: lead?.title,
      company: lead?.company,
    };

    switch (job.stepType) {
      case "profile_visit": {
        const result = await li.profileVisit(lead!.linkedinUrl);
        detail = result.detail;
        if (!result.ok) throw new Error(result.detail);
        break;
      }
      case "follow": {
        const result = await li.follow(lead!.linkedinUrl);
        detail = result.detail;
        if (!result.ok) throw new Error(result.detail);
        break;
      }
      case "endorse_skill": {
        const result = await li.endorseSkill(lead!.linkedinUrl);
        detail = result.detail;
        if (!result.ok) throw new Error(result.detail);
        break;
      }
      case "like_recent_post": {
        const result = await li.likeRecentLeadPost(lead!.linkedinUrl);
        detail = result.detail;
        if (!result.ok) throw new Error(result.detail);
        break;
      }
      case "comment_recent_post": {
        const copy = await writer.leadComment(leadCtx);
        prompt = copy.prompt;
        aiOutput = assertCopyOk(copy.text, { maxLen: 500, minLen: 10 });
        const result = await li.commentRecentLeadPost(lead!.linkedinUrl, aiOutput);
        detail = result.detail;
        if (!result.ok) throw new Error(result.detail);
        break;
      }
      case "connect": {
        const copy = await writer.inviteNote(leadCtx);
        prompt = copy.prompt;
        aiOutput = assertCopyOk(copy.text, { maxLen: 300, minLen: 10 });
        const result = await li.connect(lead!.linkedinUrl, aiOutput);
        detail = result.detail;
        if (!result.ok) throw new Error(result.detail);
        if (job.enrollmentId) {
          await db
            .update(enrollments)
            .set({
              connected: await li.isConnected(lead!.linkedinUrl),
              stepIndex: 1,
              lastStepCompletedAt: new Date(),
            })
            .where(eq(enrollments.id, job.enrollmentId));
        }
        await syncCrm(db, job.workspaceId, lead!, "connect_succeeded");
        break;
      }
      case "message": {
        const copy = await writer.followUpMessage(leadCtx);
        prompt = copy.prompt;
        aiOutput = assertCopyOk(copy.text, { maxLen: 1200, minLen: 20 });
        if (!(await li.isConnected(lead!.linkedinUrl))) {
          await db
            .update(actionJobs)
            .set({
              status: "skipped",
              detail: "not_connected",
              finishedAt: new Date(),
              prompt,
              aiOutput,
            })
            .where(eq(actionJobs.id, job.id));
          return { status: "skipped", detail: "not_connected" };
        }
        const result = await li.message(lead!.linkedinUrl, aiOutput);
        detail = result.detail;
        if (!result.ok) throw new Error(result.detail);
        if (job.enrollmentId) {
          await db
            .update(enrollments)
            .set({ lastStepCompletedAt: new Date() })
            .where(eq(enrollments.id, job.enrollmentId));
        }
        await syncCrm(db, job.workspaceId, lead!, "message_succeeded");
        break;
      }
      case "inmail": {
        const copy = await writer.inMail(leadCtx);
        prompt = copy.prompt;
        aiOutput = assertCopyOk(copy.text, { maxLen: 1900, minLen: 20 });
        const result = await li.sendInMail(lead!.linkedinUrl, copy.subject, aiOutput);
        detail = result.detail;
        if (!result.ok) throw new Error(result.detail);
        await syncCrm(db, job.workspaceId, lead!, "inmail_succeeded");
        break;
      }
      case "group_engage": {
        const groupUrl =
          (job.detail && job.detail.startsWith("http") ? job.detail : null) ??
          "https://www.linkedin.com/groups/";
        const copy = await writer.groupPost({
          topic: "pipeline systems",
          niche: "B2B",
        });
        prompt = copy.prompt;
        aiOutput = assertCopyOk(copy.text, { maxLen: 1200, minLen: 20 });
        const result = await li.groupEngage(groupUrl, aiOutput);
        detail = result.detail;
        if (!result.ok) throw new Error(result.detail);
        break;
      }
      case "find_email": {
        if (!lead?.domain) throw new Error("domain_missing");
        const found = await emailFinder.find({
          firstName: lead.firstName ?? "info",
          lastName: lead.lastName ?? "contact",
          domain: lead.domain,
        });
        const email = found[0] ?? null;
        await db
          .update(leads)
          .set({
            email,
            enrichmentStatus: email ? "found_api" : "not_found",
          })
          .where(eq(leads.id, lead.id));
        detail = email ? `found:${email}` : "not_found";
        break;
      }
      case "send_email": {
        if (!lead?.email) throw new Error("email_missing");
        const copy = await writer.email(leadCtx);
        prompt = copy.prompt;
        aiOutput = assertCopyOk(copy.text, { maxLen: 4000, minLen: 20 });
        const sent = await emailSender.send({
          to: lead.email,
          subject: copy.subject,
          body: aiOutput,
        });
        if (!sent.ok) throw new Error(sent.detail);
        await db.insert(emailMessages).values({
          workspaceId: job.workspaceId,
          leadId: lead.id,
          actionJobId: job.id,
          toAddress: lead.email,
          subject: copy.subject,
          body: copy.text,
          status: "sent",
          providerId: sent.id,
        });
        detail = sent.detail;
        await syncCrm(db, job.workspaceId, lead, "email_succeeded");
        break;
      }
      case "withdraw_invite": {
        const result = await li.withdrawOldestPending();
        detail = result.detail;
        break;
      }
      default: {
        detail = `unsupported_${job.stepType}`;
        await db
          .update(actionJobs)
          .set({ status: "skipped", detail, finishedAt: new Date() })
          .where(eq(actionJobs.id, job.id));
        return { status: "skipped", detail };
      }
    }

    await db
      .update(actionJobs)
      .set({
        status: "succeeded",
        detail,
        prompt,
        aiOutput,
        finishedAt: new Date(),
      })
      .where(eq(actionJobs.id, job.id));

    await db
      .update(linkedinSeats)
      .set({
        actionsUsedToday: seat.actionsUsedToday + 1,
        actionsUsedOutboundToday: seat.actionsUsedOutboundToday + 1,
      })
      .where(eq(linkedinSeats.id, seat.id));

    await db.insert(auditLogs).values({
      workspaceId: job.workspaceId,
      seatId: seat.id,
      actionJobId: job.id,
      level: "info",
      message: `${job.stepType}_succeeded`,
      meta: { detail },
    });

    return { status: "succeeded", detail };
  } catch (err) {
    const detail = err instanceof Error ? err.message : "unknown_error";
    await db
      .update(actionJobs)
      .set({ status: "failed", detail, finishedAt: new Date() })
      .where(eq(actionJobs.id, job.id));
    await db.insert(auditLogs).values({
      workspaceId: job.workspaceId,
      seatId: seat.id,
      actionJobId: job.id,
      level: "error",
      message: `${job.stepType}_failed`,
      meta: { detail },
    });
    return { status: "failed", detail };
  } finally {
    await releaseSeatLease(store, seat.id, workerId);
  }
}
