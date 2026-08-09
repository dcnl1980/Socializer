import { createContentWriter } from "@socializer/ai";
import { createLinkedInActions } from "@socializer/browser";
import {
  actionJobs,
  auditLogs,
  campaigns,
  contentPosts,
  linkedinSeats,
  trendSnapshots,
  type Db,
} from "@socializer/db";
import { desc, eq } from "drizzle-orm";
import { canSpendContent } from "../budget.js";
import type { LeaseStore } from "../lease.js";
import { acquireSeatLease, releaseSeatLease } from "../lease.js";

export async function processContentJob(input: {
  db: Db;
  store: LeaseStore;
  workerId: string;
  actionJobId: string;
}): Promise<{ status: string; detail: string }> {
  const { db, store, workerId, actionJobId } = input;
  const [job] = await db
    .select()
    .from(actionJobs)
    .where(eq(actionJobs.id, actionJobId))
    .limit(1);
  if (!job) return { status: "failed", detail: "job_not_found" };

  const [seat] = await db
    .select()
    .from(linkedinSeats)
    .where(eq(linkedinSeats.id, job.seatId))
    .limit(1);
  if (!seat) return { status: "failed", detail: "seat_not_found" };

  if (seat.killSwitch || seat.status === "paused" || seat.status === "restricted") {
    await db
      .update(actionJobs)
      .set({ status: "skipped", detail: `seat_${seat.status}`, finishedAt: new Date() })
      .where(eq(actionJobs.id, job.id));
    return { status: "skipped", detail: `seat_${seat.status}` };
  }

  if (!canSpendContent(seat)) {
    await db
      .update(actionJobs)
      .set({ status: "skipped", detail: "content_cap", finishedAt: new Date() })
      .where(eq(actionJobs.id, job.id));
    return { status: "skipped", detail: "content_cap" };
  }

  const leased = await acquireSeatLease(store, seat.id, workerId, 90_000);
  if (!leased) return { status: "queued", detail: "lease_busy" };

  await db
    .update(actionJobs)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(actionJobs.id, job.id));

  try {
    const li = createLinkedInActions(seat.browserEngine);
    const writer = createContentWriter();
    let detail = "";
    let prompt: string | null = null;
    let aiOutput: string | null = null;

    if (job.stepType === "content_scout") {
      const [campaign] = job.campaignId
        ? await db.select().from(campaigns).where(eq(campaigns.id, job.campaignId))
        : [undefined];
      const keywords = campaign?.config?.keywords ?? ["saas", "ai"];
      const niche = campaign?.config?.niche ?? "B2B";
      const brandVoice = campaign?.config?.brandVoice ?? "direct, practical";
      const trends = await li.scrapeTrending(keywords, 5);
      const score = trends.reduce((n, t) => n + t.reactions + t.comments * 2, 0);
      await db.insert(trendSnapshots).values({
        workspaceId: job.workspaceId,
        seatId: seat.id,
        campaignId: campaign?.id,
        keyword: keywords.join(","),
        payload: trends,
        score,
      });
      const summary = trends.map((t) => t.text).join(" | ").slice(0, 400);
      const draft = await writer.draftPost({ niche, trendSummary: summary, brandVoice });
      prompt = draft.prompt;
      aiOutput = draft.text;
      const [post] = await db
        .insert(contentPosts)
        .values({
          workspaceId: job.workspaceId,
          campaignId: campaign!.id,
          seatId: seat.id,
          status: "draft",
          topic: summary.slice(0, 120),
          prompt: draft.prompt,
          body: draft.text,
        })
        .returning();
      detail = `drafted:${post!.id}`;
      await db
        .update(actionJobs)
        .set({ contentPostId: post!.id })
        .where(eq(actionJobs.id, job.id));
    } else if (job.stepType === "content_publish" || job.stepType === "publish_post") {
      let post = job.contentPostId
        ? (
            await db
              .select()
              .from(contentPosts)
              .where(eq(contentPosts.id, job.contentPostId))
              .limit(1)
          )[0]
        : (
            await db
              .select()
              .from(contentPosts)
              .where(eq(contentPosts.seatId, seat.id))
              .orderBy(desc(contentPosts.createdAt))
              .limit(1)
          )[0];
      if (!post?.body) throw new Error("draft_missing");
      const result = await li.publishPost(post.body);
      if (!result.ok) throw new Error(result.detail);
      await db
        .update(contentPosts)
        .set({
          status: "published",
          postUrl: result.postUrl,
          publishedAt: new Date(),
        })
        .where(eq(contentPosts.id, post.id));
      detail = result.detail;
      prompt = post.prompt;
      aiOutput = post.body;
    } else if (job.stepType === "content_boost" || job.stepType === "boost_engage") {
      const [campaign] = job.campaignId
        ? await db.select().from(campaigns).where(eq(campaigns.id, job.campaignId))
        : [undefined];
      const keywords = campaign?.config?.keywords ?? ["saas"];
      const niche = campaign?.config?.niche ?? "B2B";
      const trends = await li.scrapeTrending(keywords, 3);
      for (const trend of trends.slice(0, 2)) {
        await li.likePost(trend.url);
        const comment = await writer.commentOnTrend({
          postText: trend.text,
          niche,
        });
        prompt = comment.prompt;
        aiOutput = comment.text;
        await li.commentOnPost(trend.url, comment.text);
      }
      detail = `boosted:${trends.length}`;
    } else if (job.stepType === "content_reply" || job.stepType === "reply_to_comment") {
      const post = job.contentPostId
        ? (
            await db
              .select()
              .from(contentPosts)
              .where(eq(contentPosts.id, job.contentPostId))
              .limit(1)
          )[0]
        : (
            await db
              .select()
              .from(contentPosts)
              .where(eq(contentPosts.seatId, seat.id))
              .orderBy(desc(contentPosts.createdAt))
              .limit(1)
          )[0];
      if (!post?.postUrl) throw new Error("published_post_missing");
      const comments = await li.listOwnPostComments(post.postUrl);
      for (const comment of comments.slice(0, 3)) {
        const reply = await writer.replyToComment({
          postBody: post.body ?? "",
          comment: comment.text,
        });
        prompt = reply.prompt;
        aiOutput = reply.text;
        await li.replyToComment(post.postUrl, comment.id, reply.text);
      }
      detail = `replied:${comments.length}`;
    } else {
      detail = `unsupported_${job.stepType}`;
      await db
        .update(actionJobs)
        .set({ status: "skipped", detail, finishedAt: new Date() })
        .where(eq(actionJobs.id, job.id));
      return { status: "skipped", detail };
    }

    await db
      .update(actionJobs)
      .set({
        status: "succeeded",
        detail,
        prompt,
        aiOutput,
        finishedAt: new Date(),
      })
      .where(eq(actionJobs.id, job.id));

    await db
      .update(linkedinSeats)
      .set({
        actionsUsedToday: seat.actionsUsedToday + 1,
        actionsUsedContentToday: seat.actionsUsedContentToday + 1,
      })
      .where(eq(linkedinSeats.id, seat.id));

    await db.insert(auditLogs).values({
      workspaceId: job.workspaceId,
      seatId: seat.id,
      actionJobId: job.id,
      level: "info",
      message: `${job.stepType}_succeeded`,
      meta: { detail },
    });

    return { status: "succeeded", detail };
  } catch (err) {
    const detail = err instanceof Error ? err.message : "unknown_error";
    await db
      .update(actionJobs)
      .set({ status: "failed", detail, finishedAt: new Date() })
      .where(eq(actionJobs.id, job.id));
    await db.insert(auditLogs).values({
      workspaceId: job.workspaceId,
      seatId: seat.id,
      actionJobId: job.id,
      level: "error",
      message: `${job.stepType}_failed`,
      meta: { detail },
    });
    return { status: "failed", detail };
  } finally {
    await releaseSeatLease(store, seat.id, workerId);
  }
}
