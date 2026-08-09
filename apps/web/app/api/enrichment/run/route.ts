import { listLeads } from "@socializer/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getEnrichmentQueue } from "@/lib/queue";
import { getDefaultWorkspace } from "@/lib/workspace";

const bodySchema = z.object({
  listId: z.string().uuid(),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const workspace = await getDefaultWorkspace();
  const db = getDb();
  const members = await db
    .select()
    .from(listLeads)
    .where(eq(listLeads.listId, parsed.data.listId));
  const queue = getEnrichmentQueue();
  for (const member of members) {
    await queue.add("enrich", {
      leadId: member.leadId,
      workspaceId: workspace.id,
    });
  }
  return NextResponse.json({ enqueued: members.length });
}
