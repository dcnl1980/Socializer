const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export function extractEmails(text: string): string[] {
  return Array.from(new Set(text.match(EMAIL_RE) ?? [])).map((e) =>
    e.toLowerCase(),
  );
}

export function guessEmails(
  firstName: string,
  lastName: string,
  domain: string,
): string[] {
  const f = firstName.trim().toLowerCase();
  const l = lastName.trim().toLowerCase();
  const d = domain.trim().toLowerCase().replace(/^@/, "");
  if (!f || !l || !d) return [];
  return [`${f}.${l}@${d}`, `${f}@${d}`, `${f[0]}${l}@${d}`, `${f}${l}@${d}`];
}

export function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]!
    .replace(/^@/, "");
}
