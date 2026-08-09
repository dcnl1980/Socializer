export type BrowserEngine = "patchright" | "cloakbrowser" | "fake";

export type PageLike = {
  goto(url: string, options?: { waitUntil?: string; timeout?: number }): Promise<unknown>;
  close(): Promise<void>;
};

export type BrowserSession = {
  seatId: string;
  engine: BrowserEngine;
  page?: PageLike;
  close(): Promise<void>;
};

export type OpenSeatSessionInput = {
  seatId: string;
  proxyUrl: string;
  profileDir: string;
  engine?: BrowserEngine;
  headless?: boolean;
};

export interface BrowserAdapter {
  openSeatSession(input: OpenSeatSessionInput): Promise<BrowserSession>;
}

export type ActionResult = { ok: boolean; detail: string; postUrl?: string };

export type TrendPost = {
  url: string;
  text: string;
  reactions: number;
  comments: number;
};

export type PostComment = {
  id: string;
  author: string;
  text: string;
};

export type InboxReply = {
  profileUrl: string;
  preview: string;
  at: string;
};

export interface LinkedInActions {
  loginAndWarm(email: string, password: string): Promise<ActionResult>;
  detectReplies(): Promise<InboxReply[]>;
  connect(profileUrl: string, note?: string): Promise<ActionResult>;
  message(profileUrl: string, body: string): Promise<ActionResult>;
  isConnected(profileUrl: string): Promise<boolean>;
  withdrawOldestPending(): Promise<ActionResult>;
  profileVisit(profileUrl: string): Promise<ActionResult>;
  follow(profileUrl: string): Promise<ActionResult>;
  endorseSkill(profileUrl: string, skillName?: string): Promise<ActionResult>;
  sendInMail(profileUrl: string, subject: string, body: string): Promise<ActionResult>;
  groupEngage(groupUrl: string, text: string): Promise<ActionResult>;
  likeRecentLeadPost(profileUrl: string): Promise<ActionResult>;
  commentRecentLeadPost(profileUrl: string, text: string): Promise<ActionResult>;
  likePost(postUrl: string): Promise<ActionResult>;
  commentOnPost(postUrl: string, text: string): Promise<ActionResult>;
  publishPost(text: string): Promise<ActionResult>;
  scrapeTrending(keywords: string[], limit: number): Promise<TrendPost[]>;
  listOwnPostComments(postUrl: string): Promise<PostComment[]>;
  replyToComment(
    postUrl: string,
    commentId: string,
    text: string,
  ): Promise<ActionResult>;
}

export interface EnrichmentActions {
  findEmails(
    domain: string,
    firstName: string,
    lastName: string,
  ): Promise<string[]>;
}
