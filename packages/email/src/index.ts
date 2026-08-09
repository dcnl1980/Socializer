export type { EmailFinder, EmailPayload, EmailResult, EmailSender } from "./types.js";
export { FakeEmailSender, StubEmailFinder } from "./fake.js";
export { SmtpEmailSender } from "./smtp.js";
export { HunterEmailFinder } from "./hunter.js";

import { FakeEmailSender, StubEmailFinder } from "./fake.js";
import { HunterEmailFinder } from "./hunter.js";
import { SmtpEmailSender } from "./smtp.js";
import type { EmailFinder, EmailSender } from "./types.js";

export function createEmailSender(): EmailSender {
  if (process.env.SMTP_URL) {
    return new SmtpEmailSender(process.env.SMTP_URL);
  }
  return new FakeEmailSender();
}

export function createEmailFinder(): EmailFinder {
  if (process.env.EMAIL_FINDER_API_KEY) {
    return new HunterEmailFinder(process.env.EMAIL_FINDER_API_KEY);
  }
  return new StubEmailFinder();
}
