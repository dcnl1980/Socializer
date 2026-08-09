import { enrollments, listLeads } from "@socializer/db";
import { eq } from "drizzle-orm";
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
  const members = await db
    .select()
    .from(listLeads)
    .where(eq(listLeads.listId, parsed.data.listId));

  const created = [];
  for (const member of members) {
    const [row] = await db
      .insert(enrollments)
      .values({
        sequenceId: parsed.data.sequenceId,
        leadId: member.leadId,
        status: "active",
        stepIndex: 0,
      })
      .returning();
    created.push(row);
  }

  await getSchedulerQueue().add("tick", {});
  return NextResponse.json({ enrollments: created }, { status: 201 });
}
