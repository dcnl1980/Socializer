import type { CopyResult, CopyWriter, LeadCopyContext } from "./types.js";

function contextLine(lead: LeadCopyContext): string {
  const bits = [lead.firstName];
  if (lead.title) bits.push(lead.title);
  if (lead.company) bits.push(`at ${lead.company}`);
  return bits.join(" ");
}

export class StubCopyWriter implements CopyWriter {
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
}
