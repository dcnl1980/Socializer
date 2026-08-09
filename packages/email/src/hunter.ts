import { guessEmails } from "@socializer/core";
import type { EmailFinder } from "./types.js";

/**
 * Hunter-compatible email finder.
 * Uses EMAIL_FINDER_API_KEY against EMAIL_FINDER_BASE_URL (default Hunter API).
 */
export class HunterEmailFinder implements EmailFinder {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = process.env.EMAIL_FINDER_BASE_URL ??
      "https://api.hunter.io/v2",
  ) {}

  async find(input: {
    firstName: string;
    lastName: string;
    domain: string;
  }): Promise<string[]> {
    const url = new URL(`${this.baseUrl}/email-finder`);
    url.searchParams.set("domain", input.domain);
    url.searchParams.set("first_name", input.firstName);
    url.searchParams.set("last_name", input.lastName);
    url.searchParams.set("api_key", this.apiKey);

    try {
      const res = await fetch(url);
      if (!res.ok) {
        return guessEmails(input.firstName, input.lastName, input.domain).slice(
          0,
          1,
        );
      }
      const data = (await res.json()) as {
        data?: { email?: string };
      };
      if (data.data?.email) return [data.data.email.toLowerCase()];
      return guessEmails(input.firstName, input.lastName, input.domain).slice(
        0,
        1,
      );
    } catch {
      return guessEmails(input.firstName, input.lastName, input.domain).slice(
        0,
        1,
      );
    }
  }
}
