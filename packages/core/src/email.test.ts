import { describe, expect, it } from "vitest";
import { extractEmails, guessEmails, normalizeDomain } from "./email.js";

describe("extractEmails", () => {
  it("extracts unique lowercase emails", () => {
    expect(
      extractEmails("Reach us at Hello@Acme.io or sales@acme.io thanks"),
    ).toEqual(["hello@acme.io", "sales@acme.io"]);
  });
});

describe("guessEmails", () => {
  it("builds common patterns", () => {
    expect(guessEmails("Jane", "Doe", "acme.io")).toEqual([
      "jane.doe@acme.io",
      "jane@acme.io",
      "jdoe@acme.io",
      "janedoe@acme.io",
    ]);
  });
});

describe("normalizeDomain", () => {
  it("strips protocol and path", () => {
    expect(normalizeDomain("https://www.Acme.io/about")).toBe("acme.io");
  });
});
