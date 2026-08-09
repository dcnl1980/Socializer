import { encryptSecret } from "@socializer/core";
import {
  actionJobs,
  createDb,
  enrollments,
  leads,
  linkedinSeats,
  listLeads,
  lists,
  proxies,
  sequenceSteps,
  sequences,
  workspaces,
} from "@socializer/db";
import { asc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FakeLinkedInActions } from "@socializer/browser";
import type { LeaseStore } from "../lease.js";
import { processEnrichmentJob } from "../processors/enrichment.js";
import { processLinkedInJob } from "../processors/linkedin.js";
import { runSchedulerTick } from "../scheduler.js";

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

describeDb("slice1 fake browser smoke", () => {
  const db = createDb(databaseUrl);
  const store = memoryStore();

  beforeAll(async () => {
    FakeLinkedInActions.reset();
  });

  afterAll(async () => {
    // postgres.js keeps the process alive; force exit after suite in CI via vitest forceExit if needed
  });

  it("runs connect → message and enrichment", async () => {
    const [workspace] = await db
      .insert(workspaces)
      .values({ name: `Smoke ${Date.now()}` })
      .returning();

    const [proxy] = await db
      .insert(proxies)
      .values({
        workspaceId: workspace!.id,
        label: "smoke-proxy",
        serverUrl: "http://127.0.0.1:8888",
        geo: "NL",
      })
      .returning();

    const [seat] = await db
      .insert(linkedinSeats)
      .values({
        workspaceId: workspace!.id,
        label: "smoke-seat",
        linkedinEmail: "smoke@example.com",
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
        actionsUsedToday: 0,
      })
      .returning();

    const [list] = await db
      .insert(lists)
      .values({ workspaceId: workspace!.id, name: "smoke-list" })
      .returning();

    const [lead] = await db
      .insert(leads)
      .values({
        workspaceId: workspace!.id,
        linkedinUrl: `https://www.linkedin.com/in/smoke-${Date.now()}`,
        firstName: "Ada",
        lastName: "Lovelace",
        company: "Analytical",
        domain: "analytical.example",
      })
      .returning();

    await db.insert(listLeads).values({ listId: list!.id, leadId: lead!.id });

    const [sequence] = await db
      .insert(sequences)
      .values({
        workspaceId: workspace!.id,
        seatId: seat!.id,
        name: "smoke-seq",
      })
      .returning();

    await db.insert(sequenceSteps).values([
      { sequenceId: sequence!.id, idx: 0, type: "connect", config: {} },
      {
        sequenceId: sequence!.id,
        idx: 1,
        type: "wait",
        config: { delayMinutes: 0 },
      },
      {
        sequenceId: sequence!.id,
        idx: 2,
        type: "condition",
        config: { condition: "connected", onTrueNext: 3 },
      },
      { sequenceId: sequence!.id, idx: 3, type: "message", config: {} },
    ]);

    await db.insert(enrollments).values({
      sequenceId: sequence!.id,
      leadId: lead!.id,
      status: "active",
      stepIndex: 0,
    });

    await runSchedulerTick({ db });
    let queued = await db
      .select()
      .from(actionJobs)
      .where(eq(actionJobs.seatId, seat!.id));
    expect(queued.some((j) => j.stepType === "connect")).toBe(true);

    const connectJob = queued.find((j) => j.stepType === "connect")!;
    const connectResult = await processLinkedInJob({
      db,
      store,
      workerId: "smoke",
      actionJobId: connectJob.id,
    });
    expect(connectResult.status).toBe("succeeded");

    await runSchedulerTick({ db }); // clear wait
    await runSchedulerTick({ db }); // condition -> enqueue message
    queued = await db
      .select()
      .from(actionJobs)
      .where(eq(actionJobs.seatId, seat!.id))
      .orderBy(asc(actionJobs.createdAt));
    const messageJob = queued.find((j) => j.stepType === "message");
    expect(messageJob).toBeTruthy();

    const messageResult = await processLinkedInJob({
      db,
      store,
      workerId: "smoke",
      actionJobId: messageJob!.id,
    });
    expect(messageResult.status).toBe("succeeded");

    const enrich = await processEnrichmentJob({
      db,
      leadId: lead!.id,
      workspaceId: workspace!.id,
    });
    expect(enrich.emails.length).toBeGreaterThan(0);

    const [updatedLead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, lead!.id));
    expect(updatedLead?.email).toBeTruthy();
  }, 30_000);
});
