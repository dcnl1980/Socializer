import { NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_COOKIE, authEnabled, checkPassword, signSession } from "@/lib/auth";

export async function POST(req: Request) {
  if (!authEnabled()) {
    return NextResponse.json({ ok: true, auth: "disabled" });
  }
  const parsed = z.object({ password: z.string() }).safeParse(await req.json());
  if (!parsed.success || !checkPassword(parsed.data.password)) {
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, signSession("ok"), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
