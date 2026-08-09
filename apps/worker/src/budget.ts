import { canSpend, splitBudget } from "@socializer/core";

export type SeatBudgetState = {
  dailyCapPicked: number;
  outboundBudgetPercent: number;
  actionsUsedOutboundToday: number;
  actionsUsedContentToday: number;
  actionsUsedToday: number;
};

export function canSpendOutbound(seat: SeatBudgetState, cost = 1): boolean {
  const { outbound } = splitBudget(seat.dailyCapPicked, {
    outboundPercent: seat.outboundBudgetPercent,
    contentPercent: 100 - seat.outboundBudgetPercent,
  });
  return (
    canSpend(seat.actionsUsedToday, seat.dailyCapPicked, cost) &&
    canSpend(seat.actionsUsedOutboundToday, outbound, cost)
  );
}

export function canSpendContent(seat: SeatBudgetState, cost = 1): boolean {
  const { content } = splitBudget(seat.dailyCapPicked, {
    outboundPercent: seat.outboundBudgetPercent,
    contentPercent: 100 - seat.outboundBudgetPercent,
  });
  return (
    canSpend(seat.actionsUsedToday, seat.dailyCapPicked, cost) &&
    canSpend(seat.actionsUsedContentToday, content, cost)
  );
}

export function isContentStep(stepType: string): boolean {
  return (
    stepType.startsWith("content_") ||
    stepType === "publish_post" ||
    stepType === "boost_engage" ||
    stepType === "reply_to_comment"
  );
}
