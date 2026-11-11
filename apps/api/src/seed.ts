import { initDb, closeDb, getDb } from "@moonwitness/orm";
import { seedTimeline, timelineDdl } from "@moonwitness/addon-timeline";

async function main() {
  const dbPath = process.env.DATABASE_URL ?? "./moonwitness.db";
  await initDb(dbPath);
  await getDb().exec(timelineDdl);
  await seedTimeline();
  console.log("Database seeded (idempotent)");
  closeDb();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  closeDb();
  process.exit(1);
});
