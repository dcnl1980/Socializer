import { createEnrichmentActions } from "@socializer/browser";
import { auditLogs, leads, type Db } from "@socializer/db";
import { eq } from "drizzle-orm";

export async function processEnrichmentJob(input: {
  db: Db;
  leadId: string;
  workspaceId: string;
}): Promise<{ status: string; emails: string[] }> {
  const { db, leadId, workspaceId } = input;
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) return { status: "failed", emails: [] };
  if (!lead.domain) {
    await db
      .update(leads)
      .set({ enrichmentStatus: "skipped_no_domain" })
      .where(eq(leads.id, leadId));
    return { status: "skipped", emails: [] };
  }

  const enrich = createEnrichmentActions("fake");
  const emails = await enrich.findEmails(
    lead.domain,
    lead.firstName ?? "info",
    lead.lastName ?? "contact",
  );
  const email = emails[0] ?? null;
  await db
    .update(leads)
    .set({
      email,
      enrichmentStatus: email ? "found" : "not_found",
    })
    .where(eq(leads.id, leadId));

  await db.insert(auditLogs).values({
    workspaceId,
    level: "info",
    message: "enrichment_completed",
    meta: { leadId, emails },
  });

  return { status: email ? "found" : "not_found", emails };
}
