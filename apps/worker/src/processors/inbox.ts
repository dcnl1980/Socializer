import { createLinkedInActions } from "@socializer/browser";
import {
  auditLogs,
  enrollments,
  leads,
  linkedinSeats,
  messageEvents,
  type Db,
} from "@socializer/db";
import { and, eq } from "drizzle-orm";

export async function processInboxPoll(input: {
  db: Db;
  seatId: string;
}): Promise<{ replies: number }> {
  const { db, seatId } = input;
  const [seat] = await db
    .select()
    .from(linkedinSeats)
    .where(eq(linkedinSeats.id, seatId))
    .limit(1);
  if (!seat || seat.killSwitch || seat.status !== "healthy") {
    return { replies: 0 };
  }

  const li = createLinkedInActions(seat.browserEngine);
  const replies = await li.detectReplies();
  let matched = 0;

  for (const reply of replies) {
    await db.insert(messageEvents).values({
      workspaceId: seat.workspaceId,
      seatId: seat.id,
      direction: "inbound",
      preview: reply.preview,
      profileUrl: reply.profileUrl,
    });

    // Best-effort match by linkedin URL substring in preview/profileUrl
    const allLeads = await db
      .select()
      .from(leads)
      .where(eq(leads.workspaceId, seat.workspaceId));
    const lead = allLeads.find(
      (l) =>
        reply.profileUrl.includes(l.linkedinUrl) ||
        reply.preview.includes(l.firstName ?? "") ||
        l.linkedinUrl.includes(reply.profileUrl.replace(/#.*/, "")),
    );
    if (lead) {
      matched += 1;
      await db
        .update(enrollments)
        .set({ replied: true })
        .where(
          and(eq(enrollments.leadId, lead.id), eq(enrollments.status, "active")),
        );
      await db.insert(auditLogs).values({
        workspaceId: seat.workspaceId,
        seatId: seat.id,
        level: "info",
        message: "reply_detected",
        meta: { leadId: lead.id, preview: reply.preview },
      });
    }
  }

  return { replies: matched || replies.length };
}

export async function processSeatWarm(input: {
  db: Db;
  seatId: string;
  password: string;
}): Promise<{ ok: boolean; detail: string }> {
  const { db, seatId, password } = input;
  const [seat] = await db
    .select()
    .from(linkedinSeats)
    .where(eq(linkedinSeats.id, seatId))
    .limit(1);
  if (!seat) return { ok: false, detail: "seat_not_found" };
  const li = createLinkedInActions(seat.browserEngine);
  const result = await li.loginAndWarm(seat.linkedinEmail, password);
  if (result.ok) {
    await db
      .update(linkedinSeats)
      .set({ status: "healthy" })
      .where(eq(linkedinSeats.id, seat.id));
  } else if (result.detail.includes("2fa") || result.detail.includes("challenge")) {
    await db
      .update(linkedinSeats)
      .set({ status: "needs_2fa" })
      .where(eq(linkedinSeats.id, seat.id));
  }
  return result;
}
