import { describe, expect, it } from "vitest";
import { StubCopyWriter } from "./stub.js";

describe("StubCopyWriter", () => {
  it("generates invite and follow-up", async () => {
    const writer = new StubCopyWriter();
    const invite = await writer.inviteNote({
      firstName: "Jane",
      company: "Acme",
    });
    expect(invite.text).toContain("Jane");
    expect(invite.prompt.length).toBeGreaterThan(0);
    const follow = await writer.followUpMessage({ firstName: "Jane" });
    expect(follow.text).toContain("Jane");
  });
});
