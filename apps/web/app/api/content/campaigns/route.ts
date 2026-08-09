import { campaigns } from "@socializer/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getDefaultWorkspace } from "@/lib/workspace";

export async function GET() {
  const db = getDb();
  const rows = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.type, "content"));
  return NextResponse.json({ campaigns: rows });
}

const bodySchema = z.object({
  name: z.string().min(1),
  seatId: z.string().uuid(),
  keywords: z.array(z.string()).min(1),
  brandVoice: z.string().default("direct, practical"),
  niche: z.string().default("B2B"),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const workspace = await getDefaultWorkspace();
  const db = getDb();
  const [campaign] = await db
    .insert(campaigns)
    .values({
      workspaceId: workspace.id,
      name: parsed.data.name,
      type: "content",
      seatId: parsed.data.seatId,
      config: {
        keywords: parsed.data.keywords,
        brandVoice: parsed.data.brandVoice,
        niche: parsed.data.niche,
      },
    })
    .returning();
  return NextResponse.json({ campaign }, { status: 201 });
}
