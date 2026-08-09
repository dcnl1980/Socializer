import { RealEnrichmentActions } from "./enrichment-real.js";
import { FakeEnrichmentActions } from "./fake.js";
import type { BrowserEngine, BrowserSession, EnrichmentActions } from "./types.js";

export function createEnrichmentActions(
  engine: BrowserEngine = "fake",
  session?: BrowserSession,
): EnrichmentActions {
  if (engine === "fake" || !session?.page) return new FakeEnrichmentActions();
  return new RealEnrichmentActions(session.page as never);
}
