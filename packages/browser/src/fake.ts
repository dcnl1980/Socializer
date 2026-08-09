import { extractEmails, guessEmails } from "@socializer/core";
import type {
  ActionResult,
  BrowserAdapter,
  BrowserSession,
  EnrichmentActions,
  LinkedInActions,
  OpenSeatSessionInput,
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

export class FakeLinkedInActions implements LinkedInActions {
  autoAccept = true;

  async connect(profileUrl: string, note?: string): Promise<ActionResult> {
    if (this.autoAccept) sharedConnected.add(profileUrl);
    return {
      ok: true,
      detail: note ? `connect_sent_with_note` : "connect_sent",
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

  getMessages() {
    return sharedMessages;
  }

  static reset() {
    sharedConnected.clear();
    sharedMessages.length = 0;
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
