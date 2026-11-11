import { LibSqlDriver } from "./drivers/sqlite.driver.js";

let db: LibSqlDriver | null = null;

export async function initDb(dbPath: string): Promise<LibSqlDriver> {
  if (db) {
    throw new Error("Database already initialized. Call closeDb() first.");
  }
  const driver = new LibSqlDriver();
  await driver.init(dbPath);
  db = driver;
  return driver;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function getDb(): LibSqlDriver {
  if (!db) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return db;
}