export type LeadCopyContext = {
  firstName: string;
  title?: string | null;
  company?: string | null;
};

export type CopyResult = {
  prompt: string;
  text: string;
};

export interface CopyWriter {
  inviteNote(lead: LeadCopyContext): Promise<CopyResult>;
  followUpMessage(lead: LeadCopyContext): Promise<CopyResult>;
}
