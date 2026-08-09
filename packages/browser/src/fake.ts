import { extractEmails, guessEmails } from "@socializer/core";
import type {
  ActionResult,
  BrowserAdapter,
  BrowserSession,
  EnrichmentActions,
  LinkedInActions,
  OpenSeatSessionInput,
  PostComment,
  TrendPost,
} from "./types.js";

export class FakeBrowserAdapter implements BrowserAdapter {
  async openSeatSession(input: OpenSeatSessionInput): Promise<BrowserSession> {
    return {
      seatId: input.seatId,
      engine: "fake",
      async close() {},
    };
  }
}

const sharedConnected = new Set<string>();
const sharedMessages: Array<{ profileUrl: string; body: string }> = [];
const sharedLikes = new Set<string>();
const sharedComments: Array<{ postUrl: string; text: string }> = [];
const sharedPublished: Array<{ url: string; text: string }> = [];
const sharedFeed: TrendPost[] = [
  {
    url: "https://www.linkedin.com/feed/update/urn:li:activity:trend-1",
    text: "AI agents are rewriting B2B outbound workflows this quarter.",
    reactions: 420,
    comments: 55,
  },
  {
    url: "https://www.linkedin.com/feed/update/urn:li:activity:trend-2",
    text: "Founders who post weekly compound trust faster than cold email alone.",
    reactions: 310,
    comments: 40,
  },
];
const sharedPostComments = new Map<string, PostComment[]>();
const sharedReplies: Array<{ postUrl: string; commentId: string; text: string }> =
  [];

export class FakeLinkedInActions implements LinkedInActions {
  autoAccept = true;

  async connect(profileUrl: string, note?: string): Promise<ActionResult> {
    if (this.autoAccept) sharedConnected.add(profileUrl);
    return {
      ok: true,
      detail: note ? "connect_sent_with_note" : "connect_sent",
    };
  }

  async message(profileUrl: string, body: string): Promise<ActionResult> {
    if (!sharedConnected.has(profileUrl)) {
      return { ok: false, detail: "not_connected" };
    }
    sharedMessages.push({ profileUrl, body });
    return { ok: true, detail: "message_sent" };
  }

  async isConnected(profileUrl: string): Promise<boolean> {
    return sharedConnected.has(profileUrl);
  }

  async withdrawOldestPending(): Promise<ActionResult> {
    return { ok: true, detail: "withdrawn_none" };
  }

  async likePost(postUrl: string): Promise<ActionResult> {
    sharedLikes.add(postUrl);
    return { ok: true, detail: "liked" };
  }

  async commentOnPost(postUrl: string, text: string): Promise<ActionResult> {
    sharedComments.push({ postUrl, text });
    return { ok: true, detail: "commented" };
  }

  async publishPost(text: string): Promise<ActionResult> {
    const url = `https://www.linkedin.com/feed/update/urn:li:activity:pub-${sharedPublished.length + 1}`;
    sharedPublished.push({ url, text });
    sharedPostComments.set(url, [
      {
        id: `${url}#c1`,
        author: "Alex Prospect",
        text: "This resonates — how are you measuring it?",
      },
    ]);
    return { ok: true, detail: "published", postUrl: url };
  }

  async scrapeTrending(keywords: string[], limit: number): Promise<TrendPost[]> {
    const kw = keywords.map((k) => k.toLowerCase());
    const filtered = sharedFeed.filter((p) =>
      kw.length === 0
        ? true
        : kw.some((k) => p.text.toLowerCase().includes(k)),
    );
    return filtered.slice(0, limit);
  }

  async listOwnPostComments(postUrl: string): Promise<PostComment[]> {
    return sharedPostComments.get(postUrl) ?? [];
  }

  async replyToComment(
    postUrl: string,
    commentId: string,
    text: string,
  ): Promise<ActionResult> {
    sharedReplies.push({ postUrl, commentId, text });
    return { ok: true, detail: "replied" };
  }

  getMessages() {
    return sharedMessages;
  }

  getPublished() {
    return sharedPublished;
  }

  static reset() {
    sharedConnected.clear();
    sharedMessages.length = 0;
    sharedLikes.clear();
    sharedComments.length = 0;
    sharedPublished.length = 0;
    sharedReplies.length = 0;
    sharedPostComments.clear();
  }
}

export class FakeEnrichmentActions implements EnrichmentActions {
  htmlByDomain = new Map<string, string>();

  async findEmails(
    domain: string,
    firstName: string,
    lastName: string,
  ): Promise<string[]> {
    const html = this.htmlByDomain.get(domain) ?? "";
    const found = extractEmails(html);
    if (found.length > 0) return found;
    return guessEmails(firstName, lastName, domain).slice(0, 1);
  }
}
