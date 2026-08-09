export type StepType =
  | "profile_visit"
  | "connect"
  | "message"
  | "withdraw_invite"
  | "find_email"
  | "wait"
  | "condition";

export type SequenceStep = {
  type: StepType;
  delayMinutes?: number;
  condition?: "connected" | "replied" | "has_email";
  onTrueNext?: number;
  onFalseNext?: number;
};

export type EnrollmentSnapshot = {
  stepIndex: number;
  connected: boolean;
  replied: boolean;
  hasEmail: boolean;
  lastStepCompletedAt: Date | null;
  status: "active" | "completed" | "stopped" | "paused";
  now: Date;
};

export type NextAction =
  | { type: "run_step"; stepIndex: number }
  | { type: "wait"; stepIndex: number; reason: string }
  | { type: "complete"; reason: string }
  | { type: "stop"; reason: string };
