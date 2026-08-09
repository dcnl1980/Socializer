import { createDb } from "@socializer/db";
import { Worker } from "bullmq";
import {
  QUEUE_ENRICHMENT,
  QUEUE_LINKEDIN,
  QUEUE_SCHEDULER,
  createQueues,
  createRedis,
} from "./queues.js";
import { processEnrichmentJob } from "./processors/enrichment.js";
import { processLinkedInJob } from "./processors/linkedin.js";
import { runSchedulerTick } from "./scheduler.js";

const workerId = `worker-${process.pid}`;
const connection = createRedis();
const db = createDb();
const queues = createQueues(connection);

const linkedinWorker = new Worker(
  QUEUE_LINKEDIN,
  async (job) => {
    const actionJobId = String(job.data.actionJobId);
    return processLinkedInJob({
      db,
      store: connection,
      workerId,
      actionJobId,
    });
  },
  { connection },
);

const enrichmentWorker = new Worker(
  QUEUE_ENRICHMENT,
  async (job) => {
    return processEnrichmentJob({
      db,
      leadId: String(job.data.leadId),
      workspaceId: String(job.data.workspaceId),
    });
  },
  { connection },
);

const schedulerWorker = new Worker(
  QUEUE_SCHEDULER,
  async () => runSchedulerTick({ db, linkedinQueue: queues.linkedin }),
  { connection },
);

async function boot() {
  await queues.scheduler.add(
    "tick",
    {},
    { repeat: { every: 30_000 }, removeOnComplete: true },
  );
  console.log(`Socializer worker online as ${workerId}`);
}

boot().catch((err) => {
  console.error(err);
  process.exit(1);
});

for (const w of [linkedinWorker, enrichmentWorker, schedulerWorker]) {
  w.on("failed", (job, err) => {
    console.error(`job failed ${job?.id}`, err);
  });
}
