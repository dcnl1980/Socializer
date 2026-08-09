export type CrmLead = {
  id: string;
  linkedinUrl: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
};

export type CrmSyncResult = { ok: boolean; detail: string };

export interface CrmAdapter {
  syncLead(lead: CrmLead, event: string): Promise<CrmSyncResult>;
}
