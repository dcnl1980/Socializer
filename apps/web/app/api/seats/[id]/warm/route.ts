import { decryptSecret } from "@socializer/core";
import { actionJobs, linkedinSeats } from "@socializer/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { enqueueActionJob } from "@/lib/queue";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const db = getDb();
  const [seat] = await db
    .select()
    .from(linkedinSeats)
    .where(eq(linkedinSeats.id, id))
    .limit(1);
  if (!seat) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const key = process.env.ENCRYPTION_KEY ?? "dev-only-change-me-32chars-minimum!!";
  let password = "";
  try {
    password = decryptSecret(seat.credentialsEncrypted, key);
  } catch {
    return NextResponse.json({ error: "decrypt_failed" }, { status: 400 });
  }

  const [job] = await db
    .insert(actionJobs)
    .values({
      workspaceId: seat.workspaceId,
      seatId: seat.id,
      stepType: "seat_warm",
      status: "queued",
      detail: password,
    })
    .returning();
  await enqueueActionJob(job!.id);
  return NextResponse.json({ job }, { status: 201 });
}
