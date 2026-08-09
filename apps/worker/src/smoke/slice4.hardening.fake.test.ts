import { FakeLinkedInActions } from "@socializer/browser";
import { assertCopyOk, encryptSecret, validateCopy } from "@socializer/core";
import {
  actionJobs,
  createDb,
  enrollments,
  leads,
  linkedinSeats,
  messageEvents,
  proxies,
  sequences,
  workspaces,
} from "@socializer/db";
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

describe("slice4 quality", () => {
  it("rejects spammy copy", () => {
    expect(validateCopy("Act now!!!!!").length).toBeGreaterThan(0);
    expect(() => assertCopyOk("Act now guaranteed crypto")).toThrow(/quality_failed/);
  });
});

describeDb("slice4 hardening fake", () => {
  const db = createDb(databaseUrl);
  const store = memoryStore();

  beforeAll(() => {
    FakeLinkedInActions.reset();
  });

  it("warms seat and detects replies", async () => {
    const [workspace] = await db
      .insert(workspaces)
      .values({ name: `Hardening ${Date.now()}` })
      .returning();
    const [proxy] = await db
      .insert(proxies)
      .values({
        workspaceId: workspace!.id,
        label: "h-proxy",
        serverUrl: "http://127.0.0.1:8888",
      })
      .returning();
    const [seat] = await db
      .insert(linkedinSeats)
      .values({
        workspaceId: workspace!.id,
        label: "hard-seat",
        linkedinEmail: "hard@example.com",
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
    const profileUrl = `https://www.linkedin.com/in/hard-${Date.now()}`;
    const [lead] = await db
      .insert(leads)
      .values({
        workspaceId: workspace!.id,
        linkedinUrl: profileUrl,
        firstName: "Hardy",
        lastName: "Reply",
      })
      .returning();
    const [sequence] = await db
      .insert(sequences)
      .values({
        workspaceId: workspace!.id,
        seatId: seat!.id,
        name: "hard-seq",
      })
      .returning();
    await db.insert(enrollments).values({
      sequenceId: sequence!.id,
      leadId: lead!.id,
      status: "active",
      assignedSeatId: seat!.id,
    });

    const [warmJob] = await db
      .insert(actionJobs)
      .values({
        workspaceId: workspace!.id,
        seatId: seat!.id,
        stepType: "seat_warm",
        status: "queued",
        detail: "secret",
      })
      .returning();
    const warm = await processLinkedInJob({
      db,
      store,
      workerId: "s4",
      actionJobId: warmJob!.id,
    });
    expect(warm.status).toBe("succeeded");
    expect(FakeLinkedInActions.isWarmed()).toBe(true);

    FakeLinkedInActions.pushInboxReply({
      profileUrl,
      preview: "Hardy here — thanks for reaching out",
      at: new Date().toISOString(),
    });

    const [pollJob] = await db
      .insert(actionJobs)
      .values({
        workspaceId: workspace!.id,
        seatId: seat!.id,
        stepType: "inbox_poll",
        status: "queued",
      })
      .returning();
    const poll = await processLinkedInJob({
      db,
      store,
      workerId: "s4",
      actionJobId: pollJob!.id,
    });
    expect(poll.status).toBe("succeeded");

    const events = await db
      .select()
      .from(messageEvents)
      .where(eq(messageEvents.seatId, seat!.id));
    expect(events.length).toBeGreaterThan(0);

    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.leadId, lead!.id));
    expect(enrollment?.replied).toBe(true);
  }, 30_000);
});
