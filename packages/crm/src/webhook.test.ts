import { describe, expect, it } from "vitest";
import { WebhookCrmAdapter } from "./webhook.js";

describe("WebhookCrmAdapter", () => {
  it("noops without webhook", async () => {
    WebhookCrmAdapter.reset();
    const crm = new WebhookCrmAdapter();
    const result = await crm.syncLead(
      { id: "1", linkedinUrl: "https://linkedin.com/in/a" },
      "connect_succeeded",
    );
    expect(result.detail).toBe("crm_noop");
    expect(WebhookCrmAdapter.getLog()).toHaveLength(1);
  });
});
