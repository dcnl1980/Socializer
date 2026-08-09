import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./crypto.js";

describe("crypto", () => {
  it("round-trips secrets", () => {
    const secret = "dev-only-change-me-32chars-minimum!!";
    const enc = encryptSecret("linkedin-password", secret);
    expect(decryptSecret(enc, secret)).toBe("linkedin-password");
  });
});
