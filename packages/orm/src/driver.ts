import { BetterSqlite3Driver } from "./drivers/sqlite.driver.js";

export let db: BetterSqlite3Driver | null = null;

export function initDb(dbPath: string): BetterSqlite3Driver {
  db = new BetterSqlite3Driver();
  db.init(dbPath);
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function getDb(): BetterSqlite3Driver {
  if (!db) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return db;
}
