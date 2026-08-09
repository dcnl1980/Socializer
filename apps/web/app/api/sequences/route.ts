import { sequenceSteps, sequences } from "@socializer/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getDefaultWorkspace } from "@/lib/workspace";

const stepSchema = z.object({
  type: z.enum([
    "profile_visit",
    "connect",
    "message",
    "withdraw_invite",
    "find_email",
    "wait",
    "condition",
  ]),
  delayMinutes: z.number().optional(),
  condition: z.enum(["connected", "replied", "has_email"]).optional(),
  onTrueNext: z.number().optional(),
  onFalseNext: z.number().optional(),
});

const bodySchema = z.object({
  name: z.string().min(1),
  seatId: z.string().uuid(),
  steps: z.array(stepSchema).min(1),
});

export async function GET() {
  const db = getDb();
  return NextResponse.json({ sequences: await db.select().from(sequences) });
}

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const workspace = await getDefaultWorkspace();
  const db = getDb();
  const [sequence] = await db
    .insert(sequences)
    .values({
      workspaceId: workspace.id,
      name: parsed.data.name,
      seatId: parsed.data.seatId,
    })
    .returning();

  await db.insert(sequenceSteps).values(
    parsed.data.steps.map((step, idx) => {
      const { type, ...config } = step;
      return {
        sequenceId: sequence!.id,
        idx,
        type,
        config,
      };
    }),
  );

  return NextResponse.json({ sequence }, { status: 201 });
}
