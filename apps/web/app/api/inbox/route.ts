import { messageEvents } from "@socializer/db";
import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const events = await db
    .select()
    .from(messageEvents)
    .orderBy(desc(messageEvents.createdAt))
    .limit(100);
  return NextResponse.json({ events });
}
