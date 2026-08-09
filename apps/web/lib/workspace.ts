import { workspaces } from "@socializer/db";
import { getDb } from "./db";

export async function getDefaultWorkspace() {
  const db = getDb();
  const rows = await db.select().from(workspaces).limit(1);
  if (rows[0]) return rows[0];
  const [created] = await db
    .insert(workspaces)
    .values({ name: "Internal" })
    .returning();
  return created!;
}
