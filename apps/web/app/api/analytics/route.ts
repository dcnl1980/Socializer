import { summarizeJobs } from "@socializer/core";
import {
  actionJobs,
  contentPosts,
  crmSyncLogs,
  emailMessages,
} from "@socializer/db";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const jobs = await db.select().from(actionJobs);
  const summary = summarizeJobs(
    jobs.map((j) => ({ stepType: j.stepType, status: j.status })),
  );
  const posts = await db.select().from(contentPosts);
  const emails = await db.select().from(emailMessages);
  const crm = await db.select().from(crmSyncLogs);

  return NextResponse.json({
    summary,
    contentPosts: posts.length,
    contentPublished: posts.filter((p) => p.status === "published").length,
    emailsSent: emails.filter((e) => e.status === "sent").length,
    crmSyncs: crm.length,
    crmOk: crm.filter((c) => c.ok).length,
  });
}
