import { linkedinSeats } from "@socializer/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";

const bodySchema = z.object({
  action: z.enum(["pause", "resume", "kill", "unkill"]),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const db = getDb();
  const patch =
    parsed.data.action === "pause"
      ? { status: "paused" as const }
      : parsed.data.action === "resume"
        ? { status: "healthy" as const, killSwitch: false }
        : parsed.data.action === "kill"
          ? { killSwitch: true }
          : { killSwitch: false };

  const [seat] = await db
    .update(linkedinSeats)
    .set(patch)
    .where(eq(linkedinSeats.id, id))
    .returning();

  return NextResponse.json({ seat });
}
