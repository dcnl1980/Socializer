import { encryptSecret, pickDailyCap } from "@socializer/core";
import { linkedinSeats, proxies } from "@socializer/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getDefaultWorkspace } from "@/lib/workspace";

const bodySchema = z.object({
  label: z.string().min(1),
  linkedinEmail: z.string().email(),
  linkedinPassword: z.string().min(1),
  proxyUrl: z.string().min(1),
  proxyGeo: z.string().optional(),
  timezone: z.string().default("UTC"),
  browserEngine: z.enum(["patchright", "cloakbrowser", "fake"]).default("fake"),
  dailyCapMin: z.number().int().min(1).default(10),
  dailyCapMax: z.number().int().min(1).default(20),
});

export async function GET() {
  const db = getDb();
  const seats = await db.select().from(linkedinSeats);
  return NextResponse.json({ seats });
}

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  const workspace = await getDefaultWorkspace();
  const db = getDb();
  const key = process.env.ENCRYPTION_KEY ?? "dev-only-change-me-32chars-minimum!!";

  const [proxy] = await db
    .insert(proxies)
    .values({
      workspaceId: workspace.id,
      label: `${data.label}-proxy`,
      serverUrl: data.proxyUrl,
      geo: data.proxyGeo,
    })
    .returning();

  const [seat] = await db
    .insert(linkedinSeats)
    .values({
      workspaceId: workspace.id,
      label: data.label,
      linkedinEmail: data.linkedinEmail,
      credentialsEncrypted: encryptSecret(data.linkedinPassword, key),
      proxyId: proxy!.id,
      timezone: data.timezone,
      browserEngine: data.browserEngine,
      status: "healthy",
      dailyCapMin: data.dailyCapMin,
      dailyCapMax: data.dailyCapMax,
      dailyCapPicked: pickDailyCap(data.dailyCapMin, data.dailyCapMax),
      capDay: new Date().toISOString().slice(0, 10),
    })
    .returning();

  return NextResponse.json({ seat }, { status: 201 });
}
