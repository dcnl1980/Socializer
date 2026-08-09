import { Queue } from "bullmq";
import IORedis from "ioredis";

let connection: IORedis | null = null;

function getConnection() {
  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: null,
    });
  }
  return connection;
}

export function getLinkedInQueue() {
  return new Queue("linkedin-actions", { connection: getConnection() });
}

export function getEnrichmentQueue() {
  return new Queue("enrichment", { connection: getConnection() });
}

export function getSchedulerQueue() {
  return new Queue("scheduler-ticks", { connection: getConnection() });
}

export async function enqueueActionJob(actionJobId: string) {
  await getLinkedInQueue().add("action", { actionJobId });
}
