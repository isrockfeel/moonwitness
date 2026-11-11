import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeDb, getDb, initDb } from "@moonwitness/orm";
import { backupDatabase, restoreDatabase } from "./backup.js";

const dirs: string[] = [];

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "mw-backup-"));
  dirs.push(dir);
  return dir;
}

afterEach(async () => {
  closeDb();
  for (const dir of dirs.splice(0)) {
    await rm(dir, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }).catch(
      () => {},
    );
  }
});

describe("backup and restore", () => {
  it("backs up a live database and restores it into a fresh one", async () => {
    const dir = await tempDir();
    const sourcePath = join(dir, "source.db");
    const backupPath = join(dir, "backup.db");
    const restoredPath = join(dir, "restored.db");

    await initDb(sourcePath);
    await getDb().exec("CREATE TABLE widgets(id TEXT PRIMARY KEY, name TEXT NOT NULL)");
    await getDb().run("INSERT INTO widgets(id, name) VALUES (?, ?)", ["w1", "sprocket"]);
    await getDb().run("INSERT INTO widgets(id, name) VALUES (?, ?)", ["w2", "flange"]);

    await backupDatabase(backupPath);
    expect(existsSync(backupPath)).toBe(true);
    closeDb();

    await restoreDatabase(backupPath, restoredPath);
    await initDb(restoredPath);
    const rows = await getDb().all<{ id: string; name: string }>(
      "SELECT id, name FROM widgets ORDER BY id",
    );
    expect(rows).toEqual([
      { id: "w1", name: "sprocket" },
      { id: "w2", name: "flange" },
    ]);
  });
});
