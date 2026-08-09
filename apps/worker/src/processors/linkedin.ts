import { createCopyWriter } from "@socializer/ai";
import { createLinkedInActions } from "@socializer/browser";
import { canSpend } from "@socializer/core";
import {
  actionJobs,
  auditLogs,
  enrollments,
  leads,
  linkedinSeats,
  type Db,
} from "@socializer/db";
import { eq } from "drizzle-orm";
import type { LeaseStore } from "../lease.js";
import { acquireSeatLease, releaseSeatLease } from "../lease.js";

export type ProcessLinkedInJobInput = {
  db: Db;
  store: LeaseStore;
  workerId: string;
  actionJobId: string;
};

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

  if (!canSpend(seat.actionsUsedToday, seat.dailyCapPicked)) {
    await db
      .update(actionJobs)
      .set({ status: "skipped", detail: "daily_cap", finishedAt: new Date() })
      .where(eq(actionJobs.id, job.id));
    return { status: "skipped", detail: "daily_cap" };
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
    let detail = "";
    let prompt: string | null = null;
    let aiOutput: string | null = null;

    const [lead] = job.leadId
      ? await db.select().from(leads).where(eq(leads.id, job.leadId)).limit(1)
      : [undefined];

    if (!lead?.linkedinUrl && job.stepType !== "withdraw_invite") {
      throw new Error("lead_missing");
    }

    if (job.stepType === "connect") {
      const copy = await writer.inviteNote({
        firstName: lead!.firstName ?? "there",
        title: lead!.title,
        company: lead!.company,
      });
      prompt = copy.prompt;
      aiOutput = copy.text;
      const result = await li.connect(lead!.linkedinUrl, copy.text);
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
    } else if (job.stepType === "message") {
      const copy = await writer.followUpMessage({
        firstName: lead!.firstName ?? "there",
        title: lead!.title,
        company: lead!.company,
      });
      prompt = copy.prompt;
      aiOutput = copy.text;
      const connected = await li.isConnected(lead!.linkedinUrl);
      if (!connected) {
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
      const result = await li.message(lead!.linkedinUrl, copy.text);
      detail = result.detail;
      if (!result.ok) throw new Error(result.detail);
      if (job.enrollmentId) {
        await db
          .update(enrollments)
          .set({
            stepIndex: 4,
            status: "completed",
            lastStepCompletedAt: new Date(),
          })
          .where(eq(enrollments.id, job.enrollmentId));
      }
    } else if (job.stepType === "withdraw_invite") {
      const result = await li.withdrawOldestPending();
      detail = result.detail;
    } else {
      detail = `unsupported_${job.stepType}`;
      await db
        .update(actionJobs)
        .set({ status: "skipped", detail, finishedAt: new Date() })
        .where(eq(actionJobs.id, job.id));
      return { status: "skipped", detail };
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
      .set({ actionsUsedToday: seat.actionsUsedToday + 1 })
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
