import { describe, expect, it } from "vitest";
import { pickSeat } from "./rotation.js";

describe("pickSeat", () => {
  it("picks least-used healthy seat", () => {
    const seat = pickSeat([
      { id: "a", status: "healthy", killSwitch: false, actionsUsedToday: 5 },
      { id: "b", status: "healthy", killSwitch: false, actionsUsedToday: 1 },
      { id: "c", status: "restricted", killSwitch: false, actionsUsedToday: 0 },
    ]);
    expect(seat?.id).toBe("b");
  });

  it("returns null when none healthy", () => {
    expect(
      pickSeat([
        { id: "a", status: "paused", killSwitch: false, actionsUsedToday: 0 },
      ]),
    ).toBeNull();
  });
});
