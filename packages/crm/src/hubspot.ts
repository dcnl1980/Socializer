import type { CrmAdapter, CrmLead, CrmSyncResult } from "./types.js";

/** HubSpot CRM v3 contacts upsert-by-email (or create with LinkedIn URL property). */
export class HubSpotCrmAdapter implements CrmAdapter {
  constructor(
    private readonly token: string,
    private readonly baseUrl = process.env.HUBSPOT_BASE_URL ??
      "https://api.hubapi.com",
  ) {}

  async syncLead(lead: CrmLead, event: string): Promise<CrmSyncResult> {
    const properties: Record<string, string> = {
      firstname: lead.firstName ?? "",
      lastname: lead.lastName ?? "",
      company: lead.company ?? "",
      lifecyclestage: "lead",
      hs_linkedin_url: lead.linkedinUrl,
      socializer_last_event: event,
    };
    if (lead.email) properties.email = lead.email;

    try {
      const res = await fetch(`${this.baseUrl}/crm/v3/objects/contacts`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ properties }),
      });
      if (res.status === 409 || res.ok) {
        return { ok: true, detail: res.ok ? "hubspot_created" : "hubspot_exists" };
      }
      return { ok: false, detail: `hubspot_http_${res.status}` };
    } catch (err) {
      return {
        ok: false,
        detail: err instanceof Error ? err.message : "hubspot_error",
      };
    }
  }
}
