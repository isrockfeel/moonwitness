import Database from "better-sqlite3";

/**
 * SQLite driver abstraction over better-sqlite3.
 * Keeps the ORM decoupled from the concrete database library so a
 * Postgres/libsql driver can be added later without refactoring callers.
 */
export class BetterSqlite3Driver {
  private db: Database.Database | null = null;

  init(dbPath: string): void {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }

  run(sql: string, params: unknown[] = []): Database.RunResult {
    if (!this.db) throw new Error("Database not initialized. Call initDb() first.");
    return this.db.prepare(sql).run(...params);
  }

  all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
    if (!this.db) throw new Error("Database not initialized. Call initDb() first.");
    return this.db.prepare(sql).all(...params) as T[];
  }

  get<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T | undefined {
    if (!this.db) throw new Error("Database not initialized. Call initDb() first.");
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  transaction<T>(fn: () => T): T {
    if (!this.db) throw new Error("Database not initialized. Call initDb() first.");
    return this.db.transaction(fn)();
  }

  exec(sql: string): void {
    if (!this.db) throw new Error("Database not initialized. Call initDb() first.");
    this.db.exec(sql);
  }
}
