import { pickSeat } from "@socializer/core";
import { enrollments, linkedinSeats, listLeads, sequences } from "@socializer/db";
import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getSchedulerQueue } from "@/lib/queue";

const bodySchema = z.object({
  sequenceId: z.string().uuid(),
  listId: z.string().uuid(),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const db = getDb();
  const [sequence] = await db
    .select()
    .from(sequences)
    .where(eq(sequences.id, parsed.data.sequenceId))
    .limit(1);
  if (!sequence) {
    return NextResponse.json({ error: "sequence_not_found" }, { status: 404 });
  }

  const poolIds =
    sequence.seatPool?.length > 0 ? sequence.seatPool : [sequence.seatId];
  const poolSeats = await db
    .select()
    .from(linkedinSeats)
    .where(inArray(linkedinSeats.id, poolIds));

  const members = await db
    .select()
    .from(listLeads)
    .where(eq(listLeads.listId, parsed.data.listId));

  const created = [];
  for (const member of members) {
    const picked = pickSeat(
      poolSeats.map((s) => ({
        id: s.id,
        status: s.status,
        killSwitch: s.killSwitch,
        actionsUsedToday: s.actionsUsedToday,
      })),
    );
    const assignedSeatId = picked?.id ?? sequence.seatId;
    if (picked) {
      // optimistic bump so next lead rotates
      const seat = poolSeats.find((s) => s.id === picked.id);
      if (seat) seat.actionsUsedToday += 1;
    }

    const [row] = await db
      .insert(enrollments)
      .values({
        sequenceId: parsed.data.sequenceId,
        leadId: member.leadId,
        assignedSeatId,
        status: "active",
        stepIndex: 0,
      })
      .returning();
    created.push(row);
  }

  await getSchedulerQueue().add("tick", {});
  return NextResponse.json({ enrollments: created }, { status: 201 });
}
