import { describe, expect, it } from "vitest";
import { StubContentWriter } from "./content.js";

describe("StubContentWriter", () => {
  it("drafts posts and replies", async () => {
    const writer = new StubContentWriter();
    const post = await writer.draftPost({
      niche: "B2B SaaS",
      trendSummary: "AI agents are rewriting outbound.",
      brandVoice: "direct, practical",
    });
    expect(post.text).toContain("B2B SaaS");
    const reply = await writer.replyToComment({
      postBody: post.text,
      comment: "How do you measure it?",
    });
    expect(reply.text.length).toBeGreaterThan(10);
  });
});
