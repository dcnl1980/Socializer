import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { workspaces } from "@socializer/db";
import IORedis from "ioredis";

export async function GET() {
  const checks: Record<string, string> = {
    app: "ok",
    auth: process.env.AUTH_PASSWORD ? "enabled" : "disabled",
    smtp: process.env.SMTP_URL ? "configured" : "fake",
    emailFinder: process.env.EMAIL_FINDER_API_KEY ? "configured" : "stub",
    crm: process.env.HUBSPOT_ACCESS_TOKEN
      ? "hubspot"
      : process.env.CRM_WEBHOOK_URL
        ? "webhook"
        : "noop",
  };

  try {
    const db = getDb();
    await db.select().from(workspaces).limit(1);
    checks.postgres = "ok";
  } catch {
    checks.postgres = "error";
  }

  try {
    const redis = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    await redis.connect();
    const pong = await redis.ping();
    checks.redis = pong === "PONG" ? "ok" : "error";
    await redis.quit();
  } catch {
    checks.redis = "error";
  }

  const ok = checks.postgres === "ok" && checks.redis === "ok";
  return NextResponse.json(
    { ok, checks, version: "slice4" },
    { status: ok ? 200 : 503 },
  );
}
