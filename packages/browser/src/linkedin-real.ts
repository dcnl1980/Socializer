import type { ActionResult, LinkedInActions, PageLike, PostComment, TrendPost } from "./types.js";

/**
 * Patchright-backed LinkedIn actions.
 * Selectors are intentionally centralized — LinkedIn DOM churns often.
 * Prefer fake engine in CI; use this only on worker hosts with Chrome + proxy.
 */
export class RealLinkedInActions implements LinkedInActions {
  constructor(private readonly page: PageLike & Record<string, any>) {}

  private async goto(url: string) {
    await this.page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  }

  async connect(profileUrl: string, note?: string): Promise<ActionResult> {
    await this.goto(profileUrl);
    const connect = this.page.getByRole?.("button", { name: /connect/i });
    if (!connect) return { ok: false, detail: "connect_button_missing" };
    await connect.first().click();
    if (note) {
      const addNote = this.page.getByRole?.("button", { name: /add a note/i });
      if (addNote) await addNote.first().click();
      const box = this.page.locator?.("textarea");
      if (box) await box.first().fill(note.slice(0, 300));
    }
    const send = this.page.getByRole?.("button", { name: /send/i });
    if (send) await send.first().click();
    return { ok: true, detail: "connect_sent" };
  }

  async message(profileUrl: string, body: string): Promise<ActionResult> {
    await this.goto(profileUrl);
    const message = this.page.getByRole?.("button", { name: /^message$/i });
    if (!message) return { ok: false, detail: "message_button_missing" };
    await message.first().click();
    const box = this.page.locator?.(".msg-form__contenteditable, textarea");
    if (!box) return { ok: false, detail: "message_box_missing" };
    await box.first().fill(body);
    const send = this.page.getByRole?.("button", { name: /send/i });
    if (send) await send.first().click();
    return { ok: true, detail: "message_sent" };
  }

  async isConnected(profileUrl: string): Promise<boolean> {
    await this.goto(profileUrl);
    const message = this.page.getByRole?.("button", { name: /^message$/i });
    return Boolean(message && (await message.count?.()) > 0);
  }

  async withdrawOldestPending(): Promise<ActionResult> {
    await this.goto("https://www.linkedin.com/mynetwork/invitation-manager/sent/");
    const withdraw = this.page.getByRole?.("button", { name: /withdraw/i });
    if (!withdraw || (await withdraw.count?.()) === 0) {
      return { ok: true, detail: "withdrawn_none" };
    }
    await withdraw.first().click();
    const confirm = this.page.getByRole?.("button", { name: /withdraw/i });
    if (confirm) await confirm.last().click();
    return { ok: true, detail: "withdrawn" };
  }

  async likePost(postUrl: string): Promise<ActionResult> {
    await this.goto(postUrl);
    const like = this.page.getByRole?.("button", { name: /like/i });
    if (!like) return { ok: false, detail: "like_missing" };
    await like.first().click();
    return { ok: true, detail: "liked" };
  }

  async commentOnPost(postUrl: string, text: string): Promise<ActionResult> {
    await this.goto(postUrl);
    const comment = this.page.getByRole?.("button", { name: /comment/i });
    if (comment) await comment.first().click();
    const box = this.page.locator?.(".ql-editor, textarea");
    if (!box) return { ok: false, detail: "comment_box_missing" };
    await box.first().fill(text);
    const submit = this.page.getByRole?.("button", { name: /^post$/i });
    if (submit) await submit.first().click();
    return { ok: true, detail: "commented" };
  }

  async publishPost(text: string): Promise<ActionResult> {
    await this.goto("https://www.linkedin.com/feed/");
    const start = this.page.getByRole?.("button", { name: /start a post/i });
    if (!start) return { ok: false, detail: "composer_missing" };
    await start.first().click();
    const box = this.page.locator?.(".ql-editor");
    if (!box) return { ok: false, detail: "editor_missing" };
    await box.first().fill(text);
    const post = this.page.getByRole?.("button", { name: /^post$/i });
    if (post) await post.first().click();
    return { ok: true, detail: "published", postUrl: "https://www.linkedin.com/feed/" };
  }

  async scrapeTrending(keywords: string[], limit: number): Promise<TrendPost[]> {
    const q = encodeURIComponent(keywords[0] ?? "marketing");
    await this.goto(`https://www.linkedin.com/search/results/content/?keywords=${q}`);
    const posts = this.page.locator?.("div.feed-shared-update-v2");
    const count = Math.min(limit, (await posts?.count?.()) ?? 0);
    const out: TrendPost[] = [];
    for (let i = 0; i < count; i++) {
      const item = posts.nth(i);
      const text = ((await item.innerText?.()) ?? "").slice(0, 500);
      out.push({
        url: `https://www.linkedin.com/search/results/content/?keywords=${q}#${i}`,
        text,
        reactions: 0,
        comments: 0,
      });
    }
    return out;
  }

  async listOwnPostComments(postUrl: string): Promise<PostComment[]> {
    await this.goto(postUrl);
    return [];
  }

  async replyToComment(
    postUrl: string,
    _commentId: string,
    text: string,
  ): Promise<ActionResult> {
    return this.commentOnPost(postUrl, text);
  }
}
