import { describe, expect, it } from "vitest";
import { FakeEnrichmentActions, FakeLinkedInActions } from "./fake.js";

describe("FakeLinkedInActions", () => {
  it("connects and messages", async () => {
    FakeLinkedInActions.reset();
    const li = new FakeLinkedInActions();
    const url = "https://www.linkedin.com/in/jane-doe";
    await li.connect(url, "Hi Jane");
    expect(await li.isConnected(url)).toBe(true);
    const msg = await li.message(url, "Great connecting");
    expect(msg.ok).toBe(true);
  });

  it("publishes, boosts, and replies", async () => {
    FakeLinkedInActions.reset();
    const li = new FakeLinkedInActions();
    const trends = await li.scrapeTrending(["ai", "founders"], 5);
    expect(trends.length).toBeGreaterThan(0);
    await li.likePost(trends[0]!.url);
    const published = await li.publishPost("Shipping in public compounds trust.");
    expect(published.postUrl).toBeTruthy();
    const comments = await li.listOwnPostComments(published.postUrl!);
    expect(comments.length).toBeGreaterThan(0);
    const reply = await li.replyToComment(
      published.postUrl!,
      comments[0]!.id,
      "Great question — weekly cadence.",
    );
    expect(reply.ok).toBe(true);
  });

  it("supports kitchen-sink engagement actions", async () => {
    FakeLinkedInActions.reset();
    const li = new FakeLinkedInActions();
    const url = "https://www.linkedin.com/in/kai";
    expect((await li.profileVisit(url)).ok).toBe(true);
    expect((await li.follow(url)).ok).toBe(true);
    expect((await li.endorseSkill(url, "Go")).ok).toBe(true);
    expect((await li.sendInMail(url, "Hi", "Body")).ok).toBe(true);
    expect((await li.likeRecentLeadPost(url)).ok).toBe(true);
    expect((await li.commentRecentLeadPost(url, "Nice")).ok).toBe(true);
    expect(
      (await li.groupEngage("https://www.linkedin.com/groups/1", "Hello group"))
        .ok,
    ).toBe(true);
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
