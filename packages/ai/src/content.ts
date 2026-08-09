import type { ContentWriter, CopyResult } from "./types.js";

export class StubContentWriter implements ContentWriter {
  async draftPost(input: {
    niche: string;
    trendSummary: string;
    brandVoice: string;
  }): Promise<CopyResult> {
    const prompt = `Draft a LinkedIn post. Niche: ${input.niche}. Voice: ${input.brandVoice}. Trends: ${input.trendSummary}`;
    const text = [
      `Hot take for ${input.niche}:`,
      "",
      input.trendSummary.slice(0, 180) || "Consistency beats bursts.",
      "",
      "What I'm seeing in the field:",
      "1) Specific > generic",
      "2) Proof > promises",
      "3) Conversations > broadcasts",
      "",
      "If you're building in public this quarter, what's one metric you refuse to vanity-track?",
    ].join("\n");
    return { prompt, text };
  }

  async replyToComment(input: {
    postBody: string;
    comment: string;
  }): Promise<CopyResult> {
    const prompt = `Reply to LinkedIn comment "${input.comment}" on post "${input.postBody.slice(0, 120)}"`;
    const text = `Appreciate this — ${input.comment.includes("?") ? "short answer: measure weekly compounding, not vanity spikes." : "glad it landed."}`;
    return { prompt, text };
  }

  async commentOnTrend(input: {
    postText: string;
    niche: string;
  }): Promise<CopyResult> {
    const prompt = `Write a thoughtful comment for ${input.niche} on: ${input.postText.slice(0, 160)}`;
    const text = `This tracks with what I'm seeing in ${input.niche}. The operators winning right now pair insight with a clear next step.`;
    return { prompt, text };
  }
}
