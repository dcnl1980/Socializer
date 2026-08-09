import { describe, expect, it } from "vitest";
import { FakeEmailSender, StubEmailFinder } from "./fake.js";

describe("email package", () => {
  it("sends via fake", async () => {
    FakeEmailSender.reset();
    const sender = new FakeEmailSender();
    const result = await sender.send({
      to: "jane@acme.io",
      subject: "Hello",
      body: "Hi Jane",
    });
    expect(result.ok).toBe(true);
    expect(FakeEmailSender.getSent()).toHaveLength(1);
  });

  it("finds via stub", async () => {
    const finder = new StubEmailFinder();
    const emails = await finder.find({
      firstName: "Jane",
      lastName: "Doe",
      domain: "acme.io",
    });
    expect(emails[0]).toContain("@acme.io");
  });
});
