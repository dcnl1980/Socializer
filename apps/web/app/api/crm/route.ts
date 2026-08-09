import { crmConnections } from "@socializer/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getDefaultWorkspace } from "@/lib/workspace";

export async function GET() {
  const db = getDb();
  return NextResponse.json({
    connections: await db.select().from(crmConnections),
  });
}

const bodySchema = z.object({
  webhookUrl: z.string().url().optional().or(z.literal("")),
  enabled: z.boolean().default(true),
  provider: z.string().default("webhook"),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const workspace = await getDefaultWorkspace();
  const db = getDb();
  const [row] = await db
    .insert(crmConnections)
    .values({
      workspaceId: workspace.id,
      provider: parsed.data.provider,
      webhookUrl: parsed.data.webhookUrl || null,
      enabled: parsed.data.enabled,
    })
    .returning();
  return NextResponse.json({ connection: row }, { status: 201 });
}
