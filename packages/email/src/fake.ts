import { guessEmails } from "@socializer/core";
import type { EmailFinder, EmailPayload, EmailResult, EmailSender } from "./types.js";

const sent: EmailPayload[] = [];

export class FakeEmailSender implements EmailSender {
  async send(payload: EmailPayload): Promise<EmailResult> {
    sent.push(payload);
    return { ok: true, detail: "sent", id: `fake-${sent.length}` };
  }

  static getSent() {
    return sent;
  }

  static reset() {
    sent.length = 0;
  }
}

export class StubEmailFinder implements EmailFinder {
  async find(input: {
    firstName: string;
    lastName: string;
    domain: string;
  }): Promise<string[]> {
    if (process.env.EMAIL_FINDER_API_KEY) {
      // Paid finder would go here; stub returns guess for now.
      return guessEmails(input.firstName, input.lastName, input.domain).slice(0, 1);
    }
    return guessEmails(input.firstName, input.lastName, input.domain).slice(0, 1);
  }
}
