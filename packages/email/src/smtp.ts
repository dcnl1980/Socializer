import type { EmailPayload, EmailResult, EmailSender } from "./types.js";

/** Nodemailer-backed sender. Activated when SMTP_URL is set. */
export class SmtpEmailSender implements EmailSender {
  constructor(private readonly smtpUrl: string) {}

  async send(payload: EmailPayload): Promise<EmailResult> {
    let nodemailer: {
      createTransport: (url: string) => {
        sendMail: (opts: Record<string, unknown>) => Promise<{ messageId?: string }>;
      };
    };
    try {
      nodemailer = await import("nodemailer");
    } catch {
      return {
        ok: false,
        detail: "nodemailer_not_installed: pnpm --filter @socializer/email add nodemailer",
      };
    }

    try {
      const transport = nodemailer.createTransport(this.smtpUrl);
      const info = await transport.sendMail({
        from: payload.from ?? process.env.SMTP_FROM ?? "socializer@localhost",
        to: payload.to,
        subject: payload.subject,
        text: payload.body,
      });
      return { ok: true, detail: "smtp_sent", id: info.messageId };
    } catch (err) {
      return {
        ok: false,
        detail: err instanceof Error ? err.message : "smtp_error",
      };
    }
  }
}
