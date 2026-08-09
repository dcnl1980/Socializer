import { actionJobs, linkedinSeats } from "@socializer/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { enqueueActionJob } from "@/lib/queue";

const bodySchema = z.object({
  seatId: z.string().uuid(),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const db = getDb();
  const [seat] = await db
    .select()
    .from(linkedinSeats)
    .where(eq(linkedinSeats.id, parsed.data.seatId))
    .limit(1);
  if (!seat) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [job] = await db
    .insert(actionJobs)
    .values({
      workspaceId: seat.workspaceId,
      seatId: seat.id,
      stepType: "inbox_poll",
      status: "queued",
    })
    .returning();
  await enqueueActionJob(job!.id);
  return NextResponse.json({ job }, { status: 201 });
}
