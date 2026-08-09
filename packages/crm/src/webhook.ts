import type { CrmAdapter, CrmLead, CrmSyncResult } from "./types.js";

const memoryLog: Array<{ lead: CrmLead; event: string }> = [];

export class WebhookCrmAdapter implements CrmAdapter {
  constructor(private readonly webhookUrl?: string) {}

  async syncLead(lead: CrmLead, event: string): Promise<CrmSyncResult> {
    memoryLog.push({ lead, event });
    if (!this.webhookUrl) {
      return { ok: true, detail: "crm_noop" };
    }
    try {
      const res = await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ event, lead, source: "socializer" }),
      });
      if (!res.ok) return { ok: false, detail: `crm_http_${res.status}` };
      return { ok: true, detail: "crm_synced" };
    } catch (err) {
      return {
        ok: false,
        detail: err instanceof Error ? err.message : "crm_error",
      };
    }
  }

  static getLog() {
    return memoryLog;
  }

  static reset() {
    memoryLog.length = 0;
  }
}
