import { describe, expect, it } from "vitest";
import { canSpend, pickDailyCap, splitBudget } from "./caps.js";

describe("pickDailyCap", () => {
  it("returns value within inclusive range", () => {
    const value = pickDailyCap(10, 20, () => 0.5);
    expect(value).toBeGreaterThanOrEqual(10);
    expect(value).toBeLessThanOrEqual(20);
  });

  it("returns min when rng is 0", () => {
    expect(pickDailyCap(5, 15, () => 0)).toBe(5);
  });
});

describe("canSpend", () => {
  it("allows spend under cap", () => {
    expect(canSpend(3, 10, 1)).toBe(true);
  });
  it("blocks spend at cap", () => {
    expect(canSpend(10, 10, 1)).toBe(false);
  });
});

describe("splitBudget", () => {
  it("splits 60/40 by default", () => {
    expect(splitBudget(10)).toEqual({ outbound: 6, content: 4 });
  });
});
