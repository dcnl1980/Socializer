export type EmailPayload = {
  to: string;
  subject: string;
  body: string;
  from?: string;
};

export type EmailResult = { ok: boolean; detail: string; id?: string };

export interface EmailSender {
  send(payload: EmailPayload): Promise<EmailResult>;
}

export interface EmailFinder {
  find(input: {
    firstName: string;
    lastName: string;
    domain: string;
  }): Promise<string[]>;
}
