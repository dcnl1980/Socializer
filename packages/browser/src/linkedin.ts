import { FakeLinkedInActions } from "./fake.js";
import type { BrowserEngine, LinkedInActions } from "./types.js";

export function createLinkedInActions(engine: BrowserEngine = "fake"): LinkedInActions {
  if (engine === "fake") return new FakeLinkedInActions();
  // Placeholder for Patchright DOM automation against LinkedIn.
  // Slice 1 ships with fake for tests; real selectors land behind this factory.
  return new FakeLinkedInActions();
}
