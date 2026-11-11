import { copyFile } from "node:fs/promises";
import { getDb } from "./driver.js";

/**
 * Create a consistent snapshot of the live database using SQLite's
 * `VACUUM INTO`, which writes a compacted, transactionally-consistent copy
 * without stopping readers. WAL sidecars are not needed for the backup file.
 *
 * `destination` is a filesystem path (not a `file:` URL).
 */
export async function backupDatabase(destination: string): Promise<void> {
  if (!destination || destination.trim() === "") {
    throw new Error("backup destination must be a non-empty path");
  }
  // VACUUM INTO does not accept bound parameters; escape single quotes.
  const escaped = destination.replace(/'/g, "''");
  await getDb().exec(`VACUUM INTO '${escaped}'`);
}

/**
 * Restore a database by copying a backup file over a target path. The target
 * database must be closed before restoring.
 */
export async function restoreDatabase(backupPath: string, targetPath: string): Promise<void> {
  if (!backupPath || !targetPath) {
    throw new Error("restore requires both a backup path and a target path");
  }
  await copyFile(backupPath, targetPath);
}
