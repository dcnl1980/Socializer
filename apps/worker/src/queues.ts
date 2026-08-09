import { Queue } from "bullmq";
import IORedis from "ioredis";

export const QUEUE_LINKEDIN = "linkedin-actions";
export const QUEUE_ENRICHMENT = "enrichment";
export const QUEUE_SCHEDULER = "scheduler-ticks";

export function createRedis(url = process.env.REDIS_URL ?? "redis://localhost:6379") {
  return new IORedis(url, { maxRetriesPerRequest: null });
}

export function createQueues(connection: IORedis) {
  return {
    linkedin: new Queue(QUEUE_LINKEDIN, { connection }),
    enrichment: new Queue(QUEUE_ENRICHMENT, { connection }),
    scheduler: new Queue(QUEUE_SCHEDULER, { connection }),
  };
}
