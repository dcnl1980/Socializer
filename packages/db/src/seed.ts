import { eq } from "drizzle-orm";
import { createDb } from "./client.js";
import { workspaces } from "./schema.js";

async function main() {
  const db = createDb();
  const existing = await db.select().from(workspaces).limit(1);
  if (existing.length === 0) {
    await db.insert(workspaces).values({ name: "Internal" });
    console.log("Seeded default workspace");
  } else {
    console.log("Workspace already exists:", existing[0]!.id);
  }

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.name, "Internal"))
    .limit(1);
  console.log(JSON.stringify({ workspaceId: workspace?.id }, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
