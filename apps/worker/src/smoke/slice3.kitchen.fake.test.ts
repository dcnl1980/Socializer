import { FakeLinkedInActions } from "@socializer/browser";
import { WebhookCrmAdapter } from "@socializer/crm";
import { encryptSecret, pickSeat } from "@socializer/core";
import {
  actionJobs,
  createDb,
  crmSyncLogs,
  emailMessages,
  leads,
  linkedinSeats,
  proxies,
  workspaces,
} from "@socializer/db";
import { FakeEmailSender } from "@socializer/email";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import type { LeaseStore } from "../lease.js";
import { processLinkedInJob } from "../processors/linkedin.js";

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

describeDb("slice3 kitchen sink fake", () => {
  const db = createDb(databaseUrl);
  const store = memoryStore();

  beforeAll(() => {
    FakeLinkedInActions.reset();
    FakeEmailSender.reset();
    WebhookCrmAdapter.reset();
  });

  it("runs engagement, inmail, email, and crm sync", async () => {
    expect(
      pickSeat([
        { id: "1", status: "healthy", killSwitch: false, actionsUsedToday: 2 },
        { id: "2", status: "healthy", killSwitch: false, actionsUsedToday: 0 },
      ])?.id,
    ).toBe("2");

    const [workspace] = await db
      .insert(workspaces)
      .values({ name: `Kitchen ${Date.now()}` })
      .returning();
    const [proxy] = await db
      .insert(proxies)
      .values({
        workspaceId: workspace!.id,
        label: "k-proxy",
        serverUrl: "http://127.0.0.1:8888",
      })
      .returning();
    const [seat] = await db
      .insert(linkedinSeats)
      .values({
        workspaceId: workspace!.id,
        label: "kitchen-seat",
        linkedinEmail: "kitchen@example.com",
        credentialsEncrypted: encryptSecret(
          "secret",
          process.env.ENCRYPTION_KEY ?? "dev-only-change-me-32chars-minimum!!",
        ),
        proxyId: proxy!.id,
        status: "healthy",
        browserEngine: "fake",
        dailyCapPicked: 50,
      })
      .returning();
    const [lead] = await db
      .insert(leads)
      .values({
        workspaceId: workspace!.id,
        linkedinUrl: `https://www.linkedin.com/in/kitchen-${Date.now()}`,
        firstName: "Kai",
        lastName: "Operator",
        company: "Orbit",
        domain: "orbit.example",
        email: "kai@orbit.example",
      })
      .returning();

    async function run(stepType: string) {
      const [job] = await db
        .insert(actionJobs)
        .values({
          workspaceId: workspace!.id,
          seatId: seat!.id,
          leadId: lead!.id,
          stepType,
          status: "queued",
        })
        .returning();
      return processLinkedInJob({
        db,
        store,
        workerId: "smoke3",
        actionJobId: job!.id,
      });
    }

    for (const step of [
      "profile_visit",
      "follow",
      "like_recent_post",
      "comment_recent_post",
      "endorse_skill",
      "inmail",
      "find_email",
      "send_email",
    ]) {
      const result = await run(step);
      expect(result.status).toBe("succeeded");
    }

    const emails = await db
      .select()
      .from(emailMessages)
      .where(eq(emailMessages.leadId, lead!.id));
    expect(emails.length).toBeGreaterThan(0);

    const crm = await db
      .select()
      .from(crmSyncLogs)
      .where(eq(crmSyncLogs.workspaceId, workspace!.id));
    expect(crm.some((c) => c.event === "inmail_succeeded")).toBe(true);
    expect(crm.some((c) => c.event === "email_succeeded")).toBe(true);
  }, 30_000);
});
