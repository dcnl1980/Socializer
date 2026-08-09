import { describe, expect, it } from "vitest";
import { nextEnrollmentAction } from "./sequence.js";
import type { EnrollmentSnapshot, SequenceStep } from "./types.js";

const steps: SequenceStep[] = [
  { type: "connect" },
  { type: "wait", delayMinutes: 60 },
  {
    type: "condition",
    condition: "connected",
    onTrueNext: 3,
    onFalseNext: undefined,
  },
  { type: "message" },
];

function base(partial: Partial<EnrollmentSnapshot> = {}): EnrollmentSnapshot {
  return {
    stepIndex: 0,
    connected: false,
    replied: false,
    hasEmail: false,
    lastStepCompletedAt: null,
    status: "active",
    now: new Date("2026-08-09T12:00:00Z"),
    ...partial,
  };
}

describe("nextEnrollmentAction", () => {
  it("runs connect first", () => {
    expect(nextEnrollmentAction(steps, base())).toEqual({
      type: "run_step",
      stepIndex: 0,
    });
  });

  it("waits during delay", () => {
    expect(
      nextEnrollmentAction(
        steps,
        base({
          stepIndex: 1,
          lastStepCompletedAt: new Date("2026-08-09T11:30:00Z"),
        }),
      ),
    ).toEqual({ type: "wait", stepIndex: 1, reason: "delay" });
  });

  it("routes to message when connected", () => {
    expect(
      nextEnrollmentAction(
        steps,
        base({
          stepIndex: 2,
          connected: true,
          lastStepCompletedAt: new Date("2026-08-09T10:00:00Z"),
        }),
      ),
    ).toEqual({ type: "run_step", stepIndex: 3 });
  });

  it("completes when condition false and no false branch", () => {
    expect(
      nextEnrollmentAction(steps, base({ stepIndex: 2, connected: false })),
    ).toEqual({ type: "complete", reason: "condition_terminal" });
  });

  it("stops paused enrollments", () => {
    expect(nextEnrollmentAction(steps, base({ status: "paused" }))).toEqual({
      type: "stop",
      reason: "enrollment_paused",
    });
  });
});
