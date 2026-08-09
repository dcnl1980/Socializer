import type {
  ActionResult,
  InboxReply,
  LinkedInActions,
  PageLike,
  PostComment,
  TrendPost,
} from "./types.js";

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

  async loginAndWarm(email: string, password: string): Promise<ActionResult> {
    await this.goto("https://www.linkedin.com/login");
    const user = this.page.locator?.("#username, input[name='session_key']");
    const pass = this.page.locator?.("#password, input[name='session_password']");
    if (!user || !pass) return { ok: false, detail: "login_form_missing" };
    await user.first().fill(email);
    await pass.first().fill(password);
    const submit = this.page.getByRole?.("button", { name: /sign in/i });
    if (submit) await submit.first().click();
    await this.goto("https://www.linkedin.com/feed/");
    return { ok: true, detail: "warmed" };
  }

  async detectReplies(): Promise<InboxReply[]> {
    await this.goto("https://www.linkedin.com/messaging/");
    const rows = this.page.locator?.(".msg-conversation-listitem");
    const count = Math.min(20, (await rows?.count?.()) ?? 0);
    const out: InboxReply[] = [];
    for (let i = 0; i < count; i++) {
      const item = rows.nth(i);
      const text = ((await item.innerText?.()) ?? "").slice(0, 200);
      out.push({
        profileUrl: `https://www.linkedin.com/messaging/#${i}`,
        preview: text,
        at: new Date().toISOString(),
      });
    }
    return out;
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

  async profileVisit(profileUrl: string): Promise<ActionResult> {
    await this.goto(profileUrl);
    return { ok: true, detail: "visited" };
  }

  async follow(profileUrl: string): Promise<ActionResult> {
    await this.goto(profileUrl);
    const follow = this.page.getByRole?.("button", { name: /^follow$/i });
    if (!follow) return { ok: false, detail: "follow_missing" };
    await follow.first().click();
    return { ok: true, detail: "followed" };
  }

  async endorseSkill(profileUrl: string, skillName = "Leadership"): Promise<ActionResult> {
    await this.goto(`${profileUrl}details/skills/`);
    const endorse = this.page.getByRole?.("button", { name: new RegExp(`endorse.*${skillName}`, "i") });
    if (endorse) await endorse.first().click();
    return { ok: true, detail: `endorsed:${skillName}` };
  }

  async sendInMail(profileUrl: string, subject: string, body: string): Promise<ActionResult> {
    await this.goto(profileUrl);
    const more = this.page.getByRole?.("button", { name: /more/i });
    if (more) await more.first().click();
    const inmail = this.page.getByRole?.("menuitem", { name: /message|inmail/i });
    if (inmail) await inmail.first().click();
    const subjectBox = this.page.locator?.('input[name="subject"], input[placeholder*="Subject"]');
    if (subjectBox) await subjectBox.first().fill(subject);
    const box = this.page.locator?.(".ql-editor, textarea");
    if (box) await box.first().fill(body);
    const send = this.page.getByRole?.("button", { name: /send/i });
    if (send) await send.first().click();
    return { ok: true, detail: "inmail_sent" };
  }

  async groupEngage(groupUrl: string, text: string): Promise<ActionResult> {
    await this.goto(groupUrl);
    const start = this.page.getByRole?.("button", { name: /start a post|write/i });
    if (start) await start.first().click();
    const box = this.page.locator?.(".ql-editor, textarea");
    if (box) await box.first().fill(text);
    const post = this.page.getByRole?.("button", { name: /^post$/i });
    if (post) await post.first().click();
    return { ok: true, detail: "group_posted" };
  }

  async likeRecentLeadPost(profileUrl: string): Promise<ActionResult> {
    await this.goto(`${profileUrl}recent-activity/all/`);
    const like = this.page.getByRole?.("button", { name: /like/i });
    if (!like) return { ok: false, detail: "no_recent_post" };
    await like.first().click();
    return { ok: true, detail: "liked_recent" };
  }

  async commentRecentLeadPost(profileUrl: string, text: string): Promise<ActionResult> {
    await this.goto(`${profileUrl}recent-activity/all/`);
    return this.commentOnPost(profileUrl, text);
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
