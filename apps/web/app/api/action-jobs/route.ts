import { actionJobs, auditLogs } from "@socializer/db";
import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const jobs = await db
    .select()
    .from(actionJobs)
    .orderBy(desc(actionJobs.createdAt))
    .limit(100);
  const audits = await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(100);
  return NextResponse.json({ jobs, audits });
}
