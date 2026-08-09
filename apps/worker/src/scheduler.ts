import { nextEnrollmentAction, type SequenceStep } from "@socializer/core";
import {
  actionJobs,
  enrollments,
  leads,
  sequenceSteps,
  sequences,
  type Db,
} from "@socializer/db";
import { and, asc, eq } from "drizzle-orm";
import type { Queue } from "bullmq";

export async function runSchedulerTick(input: {
  db: Db;
  linkedinQueue?: Queue;
}): Promise<number> {
  const { db, linkedinQueue } = input;
  const active = await db
    .select()
    .from(enrollments)
    .where(eq(enrollments.status, "active"));

  let enqueued = 0;
  for (const enrollment of active) {
    const [sequence] = await db
      .select()
      .from(sequences)
      .where(eq(sequences.id, enrollment.sequenceId))
      .limit(1);
    if (!sequence) continue;

    const stepsRows = await db
      .select()
      .from(sequenceSteps)
      .where(eq(sequenceSteps.sequenceId, sequence.id))
      .orderBy(asc(sequenceSteps.idx));

    const steps: SequenceStep[] = stepsRows.map((row) => ({
      type: row.type as SequenceStep["type"],
      ...(row.config as Omit<SequenceStep, "type">),
    }));

    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, enrollment.leadId))
      .limit(1);

    const decision = nextEnrollmentAction(steps, {
      stepIndex: enrollment.stepIndex,
      connected: enrollment.connected,
      replied: enrollment.replied,
      hasEmail: Boolean(lead?.email),
      lastStepCompletedAt: enrollment.lastStepCompletedAt,
      status: enrollment.status,
      now: new Date(),
    });

    if (decision.type === "complete") {
      await db
        .update(enrollments)
        .set({ status: "completed" })
        .where(eq(enrollments.id, enrollment.id));
      continue;
    }
    if (decision.type === "stop" || decision.type === "wait") continue;

    const step = steps[decision.stepIndex];
    if (!step || step.type === "wait" || step.type === "condition") {
      if (step?.type === "wait") {
        await db
          .update(enrollments)
          .set({
            stepIndex: decision.stepIndex + 1,
            lastStepCompletedAt: new Date(),
          })
          .where(eq(enrollments.id, enrollment.id));
      } else if (step?.type === "condition") {
        await db
          .update(enrollments)
          .set({ stepIndex: decision.stepIndex })
          .where(eq(enrollments.id, enrollment.id));
      }
      continue;
    }

    const existing = await db
      .select()
      .from(actionJobs)
      .where(
        and(
          eq(actionJobs.enrollmentId, enrollment.id),
          eq(actionJobs.stepType, step.type),
          eq(actionJobs.status, "queued"),
        ),
      )
      .limit(1);
    if (existing.length > 0) continue;

    const [created] = await db
      .insert(actionJobs)
      .values({
        workspaceId: sequence.workspaceId,
        seatId: sequence.seatId,
        enrollmentId: enrollment.id,
        leadId: enrollment.leadId,
        stepType: step.type,
        status: "queued",
      })
      .returning();

    if (linkedinQueue && created) {
      await linkedinQueue.add("action", { actionJobId: created.id });
    }
    enqueued += 1;
  }
  return enqueued;
}
