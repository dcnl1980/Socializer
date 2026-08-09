import { describe, expect, it } from "vitest";
import { FakeEnrichmentActions, FakeLinkedInActions } from "./fake.js";

describe("FakeLinkedInActions", () => {
  it("connects and messages", async () => {
    const li = new FakeLinkedInActions();
    const url = "https://www.linkedin.com/in/jane-doe";
    await li.connect(url, "Hi Jane");
    expect(await li.isConnected(url)).toBe(true);
    const msg = await li.message(url, "Great connecting");
    expect(msg.ok).toBe(true);
  });
});

describe("FakeEnrichmentActions", () => {
  it("extracts from html or guesses", async () => {
    const enrich = new FakeEnrichmentActions();
    enrich.htmlByDomain.set("acme.io", "Contact: team@acme.io");
    expect(await enrich.findEmails("acme.io", "Jane", "Doe")).toEqual([
      "team@acme.io",
    ]);
  });
});
