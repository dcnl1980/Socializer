import { actionJobs, campaigns } from "@socializer/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { enqueueActionJob } from "@/lib/queue";

const bodySchema = z.object({
  campaignId: z.string().uuid(),
  phase: z.enum(["scout", "publish", "boost", "reply", "all"]).default("all"),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const db = getDb();
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, parsed.data.campaignId))
    .limit(1);
  if (!campaign?.seatId) {
    return NextResponse.json({ error: "campaign_or_seat_missing" }, { status: 404 });
  }

  const phases =
    parsed.data.phase === "all"
      ? (["scout", "publish", "boost", "reply"] as const)
      : ([parsed.data.phase] as const);

  const created = [];
  for (const phase of phases) {
    const [job] = await db
      .insert(actionJobs)
      .values({
        workspaceId: campaign.workspaceId,
        seatId: campaign.seatId,
        campaignId: campaign.id,
        stepType: `content_${phase}`,
        status: "queued",
      })
      .returning();
    created.push(job);
    await enqueueActionJob(job!.id);
  }

  return NextResponse.json({ jobs: created }, { status: 201 });
}
