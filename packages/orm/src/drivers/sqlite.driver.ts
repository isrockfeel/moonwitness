import { createClient } from "@libsql/client";
import type { Client, ResultSet, Transaction } from "@libsql/client";

export interface LibSqlExecutor {
  run(sql: string, params?: unknown[]): Promise<ResultSet>;
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | undefined>;
  exec(sql: string): Promise<void>;
}

function toUrl(path: string): string {
  if (path === ":memory:") return ":memory:";
  if (path.startsWith("file:") || path.startsWith("libsql:") || path.startsWith("http")) {
    return path;
  }
  return `file:${path}`;
}

function rowToObject(row: unknown, columns: string[]): Record<string, unknown> {
  const values = row as unknown as unknown[];
  const record: Record<string, unknown> = {};
  columns.forEach((column, index) => {
    record[column] = values[index];
  });
  return record;
}

/**
 * Async local libSQL driver.
 *
 * Only local file and in-memory databases are supported here; remote
 * Turso URLs are intentionally not configured in this slice.
 */
export class LibSqlDriver implements LibSqlExecutor {
  private client: Client | null = null;

  async init(dbPath: string): Promise<void> {
    if (this.client) {
      throw new Error("Database already initialized. Close it before re-initializing.");
    }
    this.client = createClient({ url: toUrl(dbPath) });
    await this.client.execute("PRAGMA journal_mode = WAL");
    await this.client.execute("PRAGMA foreign_keys = ON");
  }

  close(): void {
    this.client?.close();
    this.client = null;
  }

  private requireClient(): Client {
    if (!this.client) {
      throw new Error("Database not initialized. Call initDb() first.");
    }
    return this.client;
  }

  async run(sql: string, params: unknown[] = []): Promise<ResultSet> {
    return this.requireClient().execute({
      sql,
      args: params as never,
    });
  }

  async all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.run(sql, params);
    return result.rows.map((row) => rowToObject(row, result.columns)) as T[];
  }

  async get<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T | undefined> {
    const rows = await this.all<T>(sql, params);
    return rows[0];
  }

  async exec(sql: string): Promise<void> {
    await this.requireClient().executeMultiple(sql);
  }

  async transaction<T>(fn: (tx: LibSqlExecutor) => Promise<T>): Promise<T> {
    const client = this.requireClient();
    const transaction: Transaction = await client.transaction("write");
    const executor: LibSqlExecutor = {
      run: (sql, params = []) => transaction.execute({ sql, args: params as never }),
      all: async <R = Record<string, unknown>>(sql: string, params: unknown[] = []) => {
        const result = await transaction.execute({ sql, args: params as never });
        return result.rows.map((row) => rowToObject(row, result.columns)) as R[];
      },
      get: async <R = Record<string, unknown>>(sql: string, params: unknown[] = []) => {
        const result = await transaction.execute({ sql, args: params as never });
        const row = result.rows[0];
        return row ? (rowToObject(row, result.columns) as R) : undefined;
      },
      exec: (sql) => transaction.executeMultiple(sql),
    };

    try {
      const result = await fn(executor);
      await transaction.commit();
      return result;
    } catch (error) {
      if (!transaction.closed) {
        await transaction.rollback();
      }
      throw error;
    }
  }
}
