export type JobRow = { stepType: string; status: string };

export type AnalyticsSummary = {
  totalJobs: number;
  succeeded: number;
  failed: number;
  skipped: number;
  connects: number;
  messages: number;
  inmails: number;
  emails: number;
  contentPublishes: number;
  successRate: number;
};

export function summarizeJobs(jobs: JobRow[]): AnalyticsSummary {
  const totalJobs = jobs.length;
  const succeeded = jobs.filter((j) => j.status === "succeeded").length;
  const failed = jobs.filter((j) => j.status === "failed").length;
  const skipped = jobs.filter((j) => j.status === "skipped").length;
  const count = (type: string) =>
    jobs.filter((j) => j.stepType === type && j.status === "succeeded").length;
  return {
    totalJobs,
    succeeded,
    failed,
    skipped,
    connects: count("connect"),
    messages: count("message"),
    inmails: count("inmail"),
    emails: count("send_email"),
    contentPublishes:
      count("content_publish") + count("publish_post"),
    successRate: totalJobs === 0 ? 0 : succeeded / totalJobs,
  };
}
