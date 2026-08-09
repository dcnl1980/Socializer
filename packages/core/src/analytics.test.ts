import { describe, expect, it } from "vitest";
import { summarizeJobs } from "./analytics.js";

describe("summarizeJobs", () => {
  it("computes rates", () => {
    const summary = summarizeJobs([
      { stepType: "connect", status: "succeeded" },
      { stepType: "connect", status: "failed" },
      { stepType: "message", status: "succeeded" },
      { stepType: "send_email", status: "succeeded" },
    ]);
    expect(summary.connects).toBe(1);
    expect(summary.messages).toBe(1);
    expect(summary.emails).toBe(1);
    expect(summary.successRate).toBe(0.75);
  });
});
