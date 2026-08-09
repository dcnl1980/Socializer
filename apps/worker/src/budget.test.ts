import { describe, expect, it } from "vitest";
import { canSpendContent, canSpendOutbound } from "./budget.js";

describe("budget split", () => {
  const seat = {
    dailyCapPicked: 10,
    outboundBudgetPercent: 60,
    actionsUsedOutboundToday: 6,
    actionsUsedContentToday: 0,
    actionsUsedToday: 6,
  };

  it("blocks outbound at outbound budget", () => {
    expect(canSpendOutbound(seat)).toBe(false);
  });

  it("allows content under content budget", () => {
    expect(canSpendContent(seat)).toBe(true);
  });
});
