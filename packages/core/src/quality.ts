export type QualityIssue = {
  code: string;
  message: string;
};

const BANNED = [
  /\bguaranteed\b/i,
  /\bact now\b/i,
  /\blimited time\b/i,
  /\bclick here\b/i,
  /\bcrypto\b/i,
  /\b Congrats[!?]{2,}/i,
];

export function validateCopy(
  text: string,
  opts: { maxLen?: number; minLen?: number } = {},
): QualityIssue[] {
  const maxLen = opts.maxLen ?? 1200;
  const minLen = opts.minLen ?? 20;
  const issues: QualityIssue[] = [];
  const trimmed = text.trim();
  if (trimmed.length < minLen) {
    issues.push({ code: "too_short", message: `Copy shorter than ${minLen}` });
  }
  if (trimmed.length > maxLen) {
    issues.push({ code: "too_long", message: `Copy longer than ${maxLen}` });
  }
  for (const re of BANNED) {
    if (re.test(trimmed)) {
      issues.push({ code: "banned_phrase", message: `Matched ${re}` });
    }
  }
  if (/(.)\1{4,}/.test(trimmed)) {
    issues.push({ code: "spam_pattern", message: "Repeated characters" });
  }
  return issues;
}

export function assertCopyOk(text: string, opts?: { maxLen?: number; minLen?: number }) {
  const issues = validateCopy(text, opts);
  if (issues.length > 0) {
    throw new Error(`quality_failed:${issues.map((i) => i.code).join(",")}`);
  }
  return text;
}
