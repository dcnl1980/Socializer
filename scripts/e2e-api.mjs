#!/usr/bin/env node
/**
 * End-to-end API smoke against a running Socializer web+worker stack (fake browser).
 */
const BASE = process.env.WEB_ORIGIN ?? "http://127.0.0.1:3000";

async function req(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} -> ${res.status}: ${text}`);
  }
  return body;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForJob(predicate, { timeoutMs = 30_000, everyMs = 1000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { jobs } = await req("/api/action-jobs");
    const hit = jobs.find(predicate);
    if (hit) return hit;
    await sleep(everyMs);
  }
  throw new Error("timeout waiting for job");
}

async function main() {
  console.log("1) health");
  const health = await req("/api/health");
  if (!health.ok) throw new Error(`unhealthy: ${JSON.stringify(health)}`);

  const stamp = Date.now();
  console.log("2) create seat");
  const { seat } = await req("/api/seats", {
    method: "POST",
    body: JSON.stringify({
      label: `e2e-${stamp}`,
      linkedinEmail: `e2e-${stamp}@example.com`,
      linkedinPassword: "test-password",
      proxyUrl: "http://user:pass@127.0.0.1:8888",
      timezone: "UTC",
      browserEngine: "fake",
      dailyCapMin: 20,
      dailyCapMax: 40,
    }),
  });

  console.log("3) warm seat");
  await req(`/api/seats/${seat.id}/warm`, { method: "POST", body: "{}" });
  await waitForJob(
    (j) => j.seatId === seat.id && j.stepType === "seat_warm" && j.status === "succeeded",
  );

  console.log("4) list + lead");
  const { list } = await req("/api/lists", {
    method: "POST",
    body: JSON.stringify({ name: `e2e-list-${stamp}` }),
  });
  const profileUrl = `https://www.linkedin.com/in/e2e-${stamp}`;
  await req(`/api/lists/${list.id}/leads`, {
    method: "POST",
    body: JSON.stringify({
      linkedinUrl: profileUrl,
      firstName: "Eve",
      lastName: "Tester",
      title: "CEO",
      company: "E2E Co",
      domain: "e2e.example",
    }),
  });

  console.log("5) enrich");
  await req("/api/enrichment/run", {
    method: "POST",
    body: JSON.stringify({ listId: list.id }),
  });

  console.log("6) sequence + enroll");
  const { sequence } = await req("/api/sequences", {
    method: "POST",
    body: JSON.stringify({
      name: `e2e-seq-${stamp}`,
      seatId: seat.id,
      seatPool: [seat.id],
      steps: [
        { type: "profile_visit" },
        { type: "connect" },
        { type: "wait", delayMinutes: 0 },
        { type: "condition", condition: "connected", onTrueNext: 4 },
        { type: "message" },
      ],
    }),
  });
  await req("/api/enrollments", {
    method: "POST",
    body: JSON.stringify({ sequenceId: sequence.id, listId: list.id }),
  });

  const tick = () => req("/api/scheduler/tick", { method: "POST", body: "{}" });
  await tick();

  console.log("7) wait visit → connect → message");
  await waitForJob(
    (j) =>
      j.seatId === seat.id &&
      j.stepType === "profile_visit" &&
      j.status === "succeeded",
    { timeoutMs: 45_000 },
  );
  await tick();
  await waitForJob(
    (j) =>
      j.seatId === seat.id &&
      j.stepType === "connect" &&
      j.status === "succeeded",
    { timeoutMs: 45_000 },
  );
  // advance wait/condition
  await tick();
  await sleep(500);
  await tick();
  await waitForJob(
    (j) =>
      j.seatId === seat.id &&
      j.stepType === "message" &&
      (j.status === "succeeded" || j.status === "skipped"),
    { timeoutMs: 45_000 },
  );

  console.log("8) content loop");
  const { campaign } = await req("/api/content/campaigns", {
    method: "POST",
    body: JSON.stringify({
      name: `e2e-content-${stamp}`,
      seatId: seat.id,
      keywords: ["ai", "saas"],
      niche: "B2B",
      brandVoice: "direct",
    }),
  });
  await req("/api/content/run", {
    method: "POST",
    body: JSON.stringify({ campaignId: campaign.id, phase: "all" }),
  });
  await waitForJob(
    (j) =>
      j.campaignId === campaign.id &&
      j.stepType === "content_scout" &&
      j.status === "succeeded",
    { timeoutMs: 45_000 },
  );
  await waitForJob(
    (j) =>
      j.campaignId === campaign.id &&
      j.stepType === "content_publish" &&
      j.status === "succeeded",
    { timeoutMs: 45_000 },
  );

  console.log("9) inbox poll + analytics");
  await req("/api/inbox/poll", {
    method: "POST",
    body: JSON.stringify({ seatId: seat.id }),
  });
  await waitForJob(
    (j) => j.seatId === seat.id && j.stepType === "inbox_poll" && j.status === "succeeded",
  );
  const analytics = await req("/api/analytics");
  if ((analytics.summary?.totalJobs ?? 0) < 1) {
    throw new Error("analytics empty");
  }

  console.log("E2E OK", {
    seatId: seat.id,
    sequenceId: sequence.id,
    campaignId: campaign.id,
    jobs: analytics.summary.totalJobs,
    connects: analytics.summary.connects,
    contentPublishes: analytics.summary.contentPublishes,
  });
}

main().catch((err) => {
  console.error("E2E FAILED", err);
  process.exit(1);
});
