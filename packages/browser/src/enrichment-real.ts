import { extractEmails, guessEmails, normalizeDomain } from "@socializer/core";
import type { EnrichmentActions, PageLike } from "./types.js";

export class RealEnrichmentActions implements EnrichmentActions {
  constructor(private readonly page: PageLike & Record<string, any>) {}

  async findEmails(
    domain: string,
    firstName: string,
    lastName: string,
  ): Promise<string[]> {
    const host = normalizeDomain(domain);
    const paths = ["", "/contact", "/about", "/team"];
    const found = new Set<string>();
    for (const path of paths) {
      try {
        await this.page.goto(`https://${host}${path}`, {
          waitUntil: "domcontentloaded",
          timeout: 30_000,
        });
        const html = (await this.page.content?.()) ?? "";
        for (const email of extractEmails(html)) found.add(email);
      } catch {
        // continue other paths
      }
    }
    if (found.size > 0) return [...found];
    return guessEmails(firstName, lastName, host).slice(0, 1);
  }
}
