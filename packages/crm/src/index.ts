export type { CrmAdapter, CrmLead, CrmSyncResult } from "./types.js";
export { WebhookCrmAdapter } from "./webhook.js";
export { HubSpotCrmAdapter } from "./hubspot.js";

import { HubSpotCrmAdapter } from "./hubspot.js";
import { WebhookCrmAdapter } from "./webhook.js";
import type { CrmAdapter } from "./types.js";

export function createCrmAdapter(): CrmAdapter {
  if (process.env.HUBSPOT_ACCESS_TOKEN) {
    return new HubSpotCrmAdapter(process.env.HUBSPOT_ACCESS_TOKEN);
  }
  return new WebhookCrmAdapter(process.env.CRM_WEBHOOK_URL);
}
