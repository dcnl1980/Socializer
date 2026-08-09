import { FakeBrowserAdapter } from "./fake.js";
import { openPersistentSession } from "./session.js";
import type {
  BrowserAdapter,
  BrowserEngine,
  OpenSeatSessionInput,
} from "./types.js";

export function createBrowserAdapter(
  engine: BrowserEngine = "fake",
): BrowserAdapter {
  if (engine === "fake") {
    return new FakeBrowserAdapter();
  }

  return {
    async openSeatSession(input: OpenSeatSessionInput) {
      const requested = input.engine ?? engine;
      try {
        return await openPersistentSession({ ...input, engine: requested });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (process.env.BROWSER_ENGINE === "fake" || process.env.ALLOW_FAKE_FALLBACK === "1") {
          console.warn(
            `[browser] falling back to fake for seat ${input.seatId}: ${message}`,
          );
          return new FakeBrowserAdapter().openSeatSession({
            ...input,
            engine: "fake",
          });
        }
        throw err;
      }
    },
  };
}
