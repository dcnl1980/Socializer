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

export interface ContentWriter {
  draftPost(input: {
    niche: string;
    trendSummary: string;
    brandVoice: string;
  }): Promise<CopyResult>;
  replyToComment(input: {
    postBody: string;
    comment: string;
  }): Promise<CopyResult>;
  commentOnTrend(input: {
    postText: string;
    niche: string;
  }): Promise<CopyResult>;
}
