import { contentPosts } from "@socializer/db";
import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const posts = await db
    .select()
    .from(contentPosts)
    .orderBy(desc(contentPosts.createdAt))
    .limit(50);
  return NextResponse.json({ posts });
}
