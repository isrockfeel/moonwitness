import { copyFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { getDb } from "@moonwitness/orm";

/**
 * Consistent logical backup using SQLite's `VACUUM INTO`, which writes a
 * transactionally consistent copy while the database may still be serving
 * reads. WAL sidecars are therefore not needed for the backup file itself.
 */
export async function backupDatabase(destination: string): Promise<void> {
  await mkdir(dirname(destination), { recursive: true }).catch(() => {});
  // Parameter binding is not supported for VACUUM INTO; escape single quotes.
  const target = destination.replace(/'/g, "''");
  await getDb().exec(`VACUUM INTO '${target}'`);
}

/** Restore by copying a backup file over a (closed) target database path. */
export async function restoreDatabase(backupPath: string, targetPath: string): Promise<void> {
  await mkdir(dirname(targetPath), { recursive: true }).catch(() => {});
  await copyFile(backupPath, targetPath);
}
