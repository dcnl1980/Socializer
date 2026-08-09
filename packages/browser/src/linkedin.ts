import { FakeLinkedInActions } from "./fake.js";
import { RealLinkedInActions } from "./linkedin-real.js";
import type { BrowserEngine, BrowserSession, LinkedInActions } from "./types.js";

export function createLinkedInActions(
  engine: BrowserEngine = "fake",
  session?: BrowserSession,
): LinkedInActions {
  if (engine === "fake" || !session?.page) return new FakeLinkedInActions();
  return new RealLinkedInActions(session.page as never);
}
