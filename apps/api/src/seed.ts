import { initDb, getDb, closeDb } from "@moonwitness/orm";
import {
  timelineDdl,
  // timelineEventModel,
  // timelineEraModel
} from "./infrastructure/persistence/timeline-model";
import { seedTimeline } from "./infrastructure/persistence/seed-data";

async function main() {
  const dbPath = process.env.DATABASE_URL ?? "./moonwitness.db";
  await initDb(dbPath);
  await getDb().exec(timelineDdl);
  await seedTimeline();
  console.log("✓ Database seeded");
  closeDb();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  closeDb();
  process.exit(1);
});
