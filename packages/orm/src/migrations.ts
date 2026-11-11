import { createHash } from "node:crypto";
import { getDb } from "./driver.js";

export interface Migration {
  id: string;
  up: string;
}

const MIGRATIONS_TABLE = "_orm_schema_migrations";

async function ensureMigrationsTable(): Promise<void> {
  await getDb().exec(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);
}

function checksum(sql: string): string {
  return createHash("sha256").update(sql).digest("hex");
}

export async function applyMigrations(
  migrations: Migration[],
): Promise<{ applied: string[]; skipped: string[] }> {
  await ensureMigrationsTable();
  const applied: string[] = [];
  const skipped: string[] = [];

  for (const migration of migrations) {
    const existing = await getDb().get<{ id: string; checksum: string }>(
      `SELECT id, checksum FROM ${MIGRATIONS_TABLE} WHERE id = ?`,
      [migration.id],
    );
    const hash = checksum(migration.up);

    if (existing) {
      if (existing.checksum !== hash) {
        throw new Error(
          `Migration '${migration.id}' checksum mismatch. Existing migrations must not be modified.`,
        );
      }
      skipped.push(migration.id);
      continue;
    }

    await getDb().transaction(async (tx) => {
      await tx.exec(migration.up);
      await tx.run(`INSERT INTO ${MIGRATIONS_TABLE} (id, checksum, applied_at) VALUES (?, ?, ?)`, [
        migration.id,
        hash,
        new Date().toISOString(),
      ]);
    });
    applied.push(migration.id);
  }

  return { applied, skipped };
}

export async function listAppliedMigrations(): Promise<
  Array<{ id: string; checksum: string; applied_at: string }>
> {
  await ensureMigrationsTable();
  return getDb().all<{ id: string; checksum: string; applied_at: string }>(
    `SELECT id, checksum, applied_at FROM ${MIGRATIONS_TABLE} ORDER BY applied_at, id`,
  );
}
