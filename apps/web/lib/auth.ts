import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "socializer_session";

function secret() {
  return process.env.ENCRYPTION_KEY ?? "dev-only-change-me-32chars-minimum!!";
}

export function authEnabled() {
  return Boolean(process.env.AUTH_PASSWORD);
}

export function signSession(value = "ok"): string {
  const sig = createHmac("sha256", secret()).update(value).digest("hex");
  return `${value}.${sig}`;
}

export function verifySession(token: string | undefined): boolean {
  if (!authEnabled()) return true;
  if (!token) return false;
  const [value, sig] = token.split(".");
  if (!value || !sig) return false;
  const expected = createHmac("sha256", secret()).update(value).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function checkPassword(password: string): boolean {
  const expected = process.env.AUTH_PASSWORD ?? "";
  if (!expected) return true;
  try {
    return timingSafeEqual(Buffer.from(password), Buffer.from(expected));
  } catch {
    return false;
  }
}

export { COOKIE as AUTH_COOKIE };
