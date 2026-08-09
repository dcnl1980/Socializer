import { describe, expect, it } from "vitest";
import { assertCopyOk, validateCopy } from "./quality.js";

describe("validateCopy", () => {
  it("flags banned phrases", () => {
    const issues = validateCopy("Act now for guaranteed growth!!!!!");
    expect(issues.some((i) => i.code === "banned_phrase")).toBe(true);
  });

  it("accepts normal copy", () => {
    expect(() =>
      assertCopyOk(
        "Hi Jane — enjoyed your work at Acme and wanted to share a concise idea.",
      ),
    ).not.toThrow();
  });
});
