export type { CrmAdapter, CrmLead, CrmSyncResult } from "./types.js";
export { WebhookCrmAdapter } from "./webhook.js";

import { WebhookCrmAdapter } from "./webhook.js";
import type { CrmAdapter } from "./types.js";

export function createCrmAdapter(): CrmAdapter {
  return new WebhookCrmAdapter(process.env.CRM_WEBHOOK_URL);
}
