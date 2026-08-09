export type { EmailFinder, EmailPayload, EmailResult, EmailSender } from "./types.js";
export { FakeEmailSender, StubEmailFinder } from "./fake.js";

import { FakeEmailSender, StubEmailFinder } from "./fake.js";
import type { EmailFinder, EmailSender } from "./types.js";

export function createEmailSender(): EmailSender {
  // SMTP_URL can be wired later; fake is safe default for DIY/CI.
  return new FakeEmailSender();
}

export function createEmailFinder(): EmailFinder {
  return new StubEmailFinder();
}
