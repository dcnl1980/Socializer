declare module "nodemailer" {
  export function createTransport(url: string): {
    sendMail: (opts: Record<string, unknown>) => Promise<{ messageId?: string }>;
  };
}
