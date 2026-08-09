import { NextResponse } from "next/server";
import { getSchedulerQueue } from "@/lib/queue";

export async function POST() {
  await getSchedulerQueue().add("tick", {});
  return NextResponse.json({ ok: true });
}
