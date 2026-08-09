import type { EnrollmentSnapshot, NextAction, SequenceStep } from "./types.js";

export function nextEnrollmentAction(
  steps: SequenceStep[],
  enrollment: EnrollmentSnapshot,
): NextAction {
  if (enrollment.status !== "active") {
    return { type: "stop", reason: `enrollment_${enrollment.status}` };
  }
  if (enrollment.stepIndex >= steps.length) {
    return { type: "complete", reason: "sequence_finished" };
  }

  const step = steps[enrollment.stepIndex]!;

  if (step.type === "wait") {
    const delay = (step.delayMinutes ?? 0) * 60_000;
    const last = enrollment.lastStepCompletedAt?.getTime() ?? 0;
    if (enrollment.now.getTime() - last < delay) {
      return { type: "wait", stepIndex: enrollment.stepIndex, reason: "delay" };
    }
    return { type: "run_step", stepIndex: enrollment.stepIndex };
  }

  if (step.type === "condition") {
    const ok =
      step.condition === "connected"
        ? enrollment.connected
        : step.condition === "replied"
          ? enrollment.replied
          : enrollment.hasEmail;
    const next = ok ? step.onTrueNext : step.onFalseNext;
    if (next === undefined) {
      return { type: "complete", reason: "condition_terminal" };
    }
    return { type: "run_step", stepIndex: next };
  }

  return { type: "run_step", stepIndex: enrollment.stepIndex };
}
