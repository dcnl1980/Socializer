import { describe, expect, it } from "vitest";
import { HunterEmailFinder } from "./hunter.js";

describe("HunterEmailFinder", () => {
  it("falls back to guess when API fails", async () => {
    const finder = new HunterEmailFinder("test-key", "http://127.0.0.1:9");
    const emails = await finder.find({
      firstName: "Jane",
      lastName: "Doe",
      domain: "acme.io",
    });
    expect(emails[0]).toBe("jane.doe@acme.io");
  });
});
