import { lists } from "@socializer/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getDefaultWorkspace } from "@/lib/workspace";

export async function GET() {
  const db = getDb();
  return NextResponse.json({ lists: await db.select().from(lists) });
}

export async function POST(req: Request) {
  const schema = z.object({ name: z.string().min(1) });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const workspace = await getDefaultWorkspace();
  const db = getDb();
  const [list] = await db
    .insert(lists)
    .values({ workspaceId: workspace.id, name: parsed.data.name })
    .returning();
  return NextResponse.json({ list }, { status: 201 });
}
