export type StepType =
  | "profile_visit"
  | "follow"
  | "like_recent_post"
  | "comment_recent_post"
  | "endorse_skill"
  | "connect"
  | "message"
  | "inmail"
  | "group_engage"
  | "withdraw_invite"
  | "find_email"
  | "send_email"
  | "wait"
  | "condition";

export type SequenceStep = {
  type: StepType;
  delayMinutes?: number;
  condition?: "connected" | "replied" | "has_email";
  onTrueNext?: number;
  onFalseNext?: number;
  skillName?: string;
  groupUrl?: string;
  emailSubject?: string;
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

export type SeatCandidate = {
  id: string;
  status: string;
  killSwitch: boolean;
  actionsUsedToday: number;
};
