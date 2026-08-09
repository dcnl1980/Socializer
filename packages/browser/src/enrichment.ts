import { FakeEnrichmentActions } from "./fake.js";
import type { BrowserEngine, EnrichmentActions } from "./types.js";

export function createEnrichmentActions(
  engine: BrowserEngine = "fake",
): EnrichmentActions {
  if (engine === "fake") return new FakeEnrichmentActions();
  // CloakBrowser website crawl wires here when proxy + binary are configured.
  return new FakeEnrichmentActions();
}
