import { leads, listLeads } from "@socializer/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getDefaultWorkspace } from "@/lib/workspace";

const bodySchema = z.object({
  linkedinUrl: z.string().url(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  title: z.string().optional(),
  company: z.string().optional(),
  domain: z.string().optional(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: listId } = await ctx.params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const workspace = await getDefaultWorkspace();
  const db = getDb();
  const [lead] = await db
    .insert(leads)
    .values({
      workspaceId: workspace.id,
      ...parsed.data,
    })
    .returning();
  await db.insert(listLeads).values({ listId, leadId: lead!.id });
  return NextResponse.json({ lead }, { status: 201 });
}
