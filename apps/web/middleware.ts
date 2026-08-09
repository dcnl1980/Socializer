import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "socializer_session";

function authEnabled() {
  return Boolean(process.env.AUTH_PASSWORD);
}

function verify(token: string | undefined): boolean {
  if (!authEnabled()) return true;
  if (!token) return false;
  // Lightweight check in edge: presence + shape. Full HMAC verified in API/login.
  return token.includes(".") && token.length > 20;
}

export function middleware(req: NextRequest) {
  if (!authEnabled()) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/login") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE)?.value;
  if (!verify(token)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
