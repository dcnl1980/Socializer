import { describe, expect, it } from "vitest";
import { health } from "./health.js";

describe("health", () => {
  it("returns ok", () => {
    expect(health()).toEqual({ ok: true });
  });
});
