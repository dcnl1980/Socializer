import { FakeBrowserAdapter } from "./fake.js";
import type { BrowserAdapter, BrowserEngine, OpenSeatSessionInput } from "./types.js";

export function createBrowserAdapter(engine: BrowserEngine = "fake"): BrowserAdapter {
  if (engine === "fake") {
    return new FakeBrowserAdapter();
  }

  // Real engines are optional at runtime; fall back to fake with a clear detail path.
  // Patchright / CloakBrowser can be wired when binaries are present on the worker host.
  return {
    async openSeatSession(input: OpenSeatSessionInput) {
      const requested = input.engine ?? engine;
      if (requested !== "fake") {
        console.warn(
          `[browser] engine=${requested} requested but not fully wired; using fake session for seat ${input.seatId}`,
        );
      }
      return new FakeBrowserAdapter().openSeatSession({
        ...input,
        engine: "fake",
      });
    },
  };
}
