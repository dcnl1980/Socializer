export type BrowserEngine = "patchright" | "cloakbrowser" | "fake";

export type BrowserSession = {
  seatId: string;
  engine: BrowserEngine;
  close(): Promise<void>;
};

export type OpenSeatSessionInput = {
  seatId: string;
  proxyUrl: string;
  profileDir: string;
  engine?: BrowserEngine;
};

export interface BrowserAdapter {
  openSeatSession(input: OpenSeatSessionInput): Promise<BrowserSession>;
}

export type ActionResult = { ok: boolean; detail: string };

export interface LinkedInActions {
  connect(profileUrl: string, note?: string): Promise<ActionResult>;
  message(profileUrl: string, body: string): Promise<ActionResult>;
  isConnected(profileUrl: string): Promise<boolean>;
  withdrawOldestPending(): Promise<ActionResult>;
}

export interface EnrichmentActions {
  findEmails(
    domain: string,
    firstName: string,
    lastName: string,
  ): Promise<string[]>;
}
