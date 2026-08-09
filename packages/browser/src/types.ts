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

export interface LinkedInActions {
  connect(profileUrl: string, note?: string): Promise<ActionResult>;
  message(profileUrl: string, body: string): Promise<ActionResult>;
  isConnected(profileUrl: string): Promise<boolean>;
  withdrawOldestPending(): Promise<ActionResult>;
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
