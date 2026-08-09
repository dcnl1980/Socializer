import { FakeLinkedInActions } from "@socializer/browser";
import { encryptSecret } from "@socializer/core";
import {
  actionJobs,
  campaigns,
  contentPosts,
  createDb,
  linkedinSeats,
  proxies,
  trendSnapshots,
  workspaces,
} from "@socializer/db";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import type { LeaseStore } from "../lease.js";
import { processContentJob } from "../processors/content.js";

const databaseUrl = process.env.DATABASE_URL;
const describeDb = databaseUrl ? describe : describe.skip;

function memoryStore(): LeaseStore {
  const map = new Map<string, string>();
  return {
    async set(key, value, _mode, _ttl, flag) {
      if (flag === "NX" && map.has(key)) return null;
      map.set(key, value);
      return "OK";
    },
    async get(key) {
      return map.get(key) ?? null;
    },
    async del(key) {
      return map.delete(key) ? 1 : 0;
    },
  };
}

describeDb("slice2 content fake loop", () => {
  const db = createDb(databaseUrl);
  const store = memoryStore();

  beforeAll(() => {
    FakeLinkedInActions.reset();
  });

  it("scouts, publishes, boosts, and replies", async () => {
    const [workspace] = await db
      .insert(workspaces)
      .values({ name: `Content Smoke ${Date.now()}` })
      .returning();
    const [proxy] = await db
      .insert(proxies)
      .values({
        workspaceId: workspace!.id,
        label: "c-proxy",
        serverUrl: "http://127.0.0.1:8888",
      })
      .returning();
    const [seat] = await db
      .insert(linkedinSeats)
      .values({
        workspaceId: workspace!.id,
        label: "content-seat",
        linkedinEmail: "content@example.com",
        credentialsEncrypted: encryptSecret(
          "secret",
          process.env.ENCRYPTION_KEY ?? "dev-only-change-me-32chars-minimum!!",
        ),
        proxyId: proxy!.id,
        status: "healthy",
        browserEngine: "fake",
        dailyCapMin: 20,
        dailyCapMax: 30,
        dailyCapPicked: 25,
        outboundBudgetPercent: 60,
      })
      .returning();
    const [campaign] = await db
      .insert(campaigns)
      .values({
        workspaceId: workspace!.id,
        seatId: seat!.id,
        name: "content-camp",
        type: "content",
        config: {
          keywords: ["ai", "founders"],
          niche: "B2B SaaS",
          brandVoice: "direct",
        },
      })
      .returning();

    async function run(stepType: string, contentPostId?: string) {
      const [job] = await db
        .insert(actionJobs)
        .values({
          workspaceId: workspace!.id,
          seatId: seat!.id,
          campaignId: campaign!.id,
          contentPostId,
          stepType,
          status: "queued",
        })
        .returning();
      return processContentJob({
        db,
        store,
        workerId: "smoke2",
        actionJobId: job!.id,
      });
    }

    const scout = await run("content_scout");
    expect(scout.status).toBe("succeeded");

    const trends = await db
      .select()
      .from(trendSnapshots)
      .where(eq(trendSnapshots.campaignId, campaign!.id));
    expect(trends.length).toBeGreaterThan(0);

    const drafts = await db
      .select()
      .from(contentPosts)
      .where(eq(contentPosts.campaignId, campaign!.id));
    expect(drafts[0]?.status).toBe("draft");

    const publish = await run("content_publish", drafts[0]!.id);
    expect(publish.status).toBe("succeeded");

    const [published] = await db
      .select()
      .from(contentPosts)
      .where(eq(contentPosts.id, drafts[0]!.id));
    expect(published?.status).toBe("published");
    expect(published?.postUrl).toBeTruthy();

    expect((await run("content_boost")).status).toBe("succeeded");
    expect((await run("content_reply", published!.id)).status).toBe("succeeded");
  }, 30_000);
});
