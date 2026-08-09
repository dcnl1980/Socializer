import { describe, expect, it } from "vitest";
import { HubSpotCrmAdapter } from "./hubspot.js";

describe("HubSpotCrmAdapter", () => {
  it("returns error detail when endpoint unreachable", async () => {
    const crm = new HubSpotCrmAdapter("token", "http://127.0.0.1:9");
    const result = await crm.syncLead(
      { id: "1", linkedinUrl: "https://linkedin.com/in/a", email: "a@b.co" },
      "connect_succeeded",
    );
    expect(result.ok).toBe(false);
    expect(result.detail.length).toBeGreaterThan(0);
  });
});
