import { initDb, applyMigrations, closeDb, getDb } from "@moonwitness/orm";
import type { LibSqlDriver } from "@moonwitness/orm";
import { scopeMigrations } from "./migrations";

let initialized = false;

/**
 * Resolve the local SQLite path.
 *
 * In Tauri, the app data dir is provided by the Rust shell via the
 * `scope_db_path` command. In browser dev (no Tauri), fall back to an
 * in-memory database so the UI still renders.
 */
async function resolveDbPath(): Promise<string> {
  const tauri = (window as unknown as { __TAURI__?: unknown }).__TAURI__;
  if (tauri) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<string>("scope_db_path");
  }
  return ":memory:";
}

export async function initScopeDb(): Promise<LibSqlDriver> {
  if (initialized) {
    throw new Error("Scope DB already initialized.");
  }
  const dbPath = await resolveDbPath();
  const driver = await initDb(dbPath);
  await applyMigrations(scopeMigrations);
  initialized = true;
  return driver;
}

export function getScopeDb(): LibSqlDriver {
  return getDb();
}

export function closeScopeDb(): void {
  if (initialized) {
    closeDb();
    initialized = false;
  }
}
