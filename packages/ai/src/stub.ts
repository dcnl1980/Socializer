import type {
  CopyResult,
  LeadCopyContext,
  OutreachCopyWriter,
} from "./types.js";

function contextLine(lead: LeadCopyContext): string {
  const bits = [lead.firstName];
  if (lead.title) bits.push(lead.title);
  if (lead.company) bits.push(`at ${lead.company}`);
  return bits.join(" ");
}

export class StubCopyWriter implements OutreachCopyWriter {
  async inviteNote(lead: LeadCopyContext): Promise<CopyResult> {
    const prompt = `Write a short LinkedIn invite note for ${contextLine(lead)}`;
    const text = `Hi ${lead.firstName}, enjoyed your work${lead.company ? ` at ${lead.company}` : ""} — would love to connect.`;
    return { prompt, text: text.slice(0, 300) };
  }

  async followUpMessage(lead: LeadCopyContext): Promise<CopyResult> {
    const prompt = `Write a short LinkedIn follow-up for ${contextLine(lead)}`;
    const text = `Thanks for connecting, ${lead.firstName}. Curious what you're focused on this quarter.`;
    return { prompt, text };
  }

  async inMail(lead: LeadCopyContext): Promise<CopyResult & { subject: string }> {
    const prompt = `Write a LinkedIn InMail for ${contextLine(lead)}`;
    const subject = `${lead.firstName}, quick idea for ${lead.company ?? "your team"}`;
    const text = `Hi ${lead.firstName} — saw your work${lead.company ? ` at ${lead.company}` : ""} and had a concise idea worth 2 minutes.`;
    return { prompt, subject, text };
  }

  async groupPost(input: { topic: string; niche: string }): Promise<CopyResult> {
    const prompt = `Write a LinkedIn group post about ${input.topic} for ${input.niche}`;
    const text = `In ${input.niche}, "${input.topic}" keeps coming up. What's working for you right now?`;
    return { prompt, text };
  }

  async leadComment(lead: LeadCopyContext): Promise<CopyResult> {
    const prompt = `Write a comment on ${contextLine(lead)}'s recent post`;
    const text = `Sharp point, ${lead.firstName} — especially the practical angle.`;
    return { prompt, text };
  }

  async email(lead: LeadCopyContext): Promise<CopyResult & { subject: string }> {
    const prompt = `Write a short cold email for ${contextLine(lead)}`;
    const subject = `Idea for ${lead.company ?? lead.firstName}`;
    const text = `Hi ${lead.firstName},\n\nQuick thought on ${lead.company ?? "your roadmap"} — happy to share a 3-bullet version if useful.\n\nBest`;
    return { prompt, subject, text };
  }
}
