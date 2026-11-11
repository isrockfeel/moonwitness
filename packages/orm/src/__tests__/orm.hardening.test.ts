import { z } from "zod";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  applyMigrations,
  closeDb,
  createActorContext,
  defineModel,
  getDb,
  initDb,
  listAppliedMigrations,
} from "../index.js";

const noteSchema = z.object({
  title: z.string(),
  body: z.string().optional(),
});

const noteModel = defineModel({
  name: "test.note",
  table: "test_notes",
  schema: noteSchema,
  indexes: [{ fields: ["title"] }],
});

let dir = "";

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "mw-orm-hardening-"));
  await initDb(join(dir, "orm.db"));
  await getDb().exec(noteModel.ddl);
});

afterEach(async () => {
  closeDb();
  if (dir) await rm(dir, { recursive: true, force: true }).catch(() => {});
});

describe("BaseRepository list/count and soft-delete consistency", () => {
  it("count and list respect soft-delete the same as find/findOne", async () => {
    const a = await noteModel.repository.create({ title: "a" });
    await noteModel.repository.create({ title: "b" });
    await noteModel.repository.delete(a.id, createActorContext("u", "api"));

    expect(await noteModel.repository.count()).toBe(1);
    expect((await noteModel.repository.list()).map((r) => r.title)).toEqual(["b"]);
    expect(await noteModel.repository.findOne(a.id)).toBeNull();

    expect(await noteModel.repository.count({}, { includeDeleted: true })).toBe(2);
    await expect(noteModel.repository.list({}, { includeDeleted: true })).resolves.toHaveLength(2);
  });

  it("count applies filters and excludes deleted rows", async () => {
    const a = await noteModel.repository.create({ title: "same", body: "x" });
    await noteModel.repository.create({ title: "same", body: "y" });
    await noteModel.repository.delete(a.id);

    expect(await noteModel.repository.count({ title: "same" })).toBe(1);
    expect(await noteModel.repository.count({ title: "same" }, { includeDeleted: true })).toBe(2);
  });
});

describe("migrations", () => {
  it("applies migrations deterministically and is idempotent on rerun", async () => {
    const migrations = [
      {
        id: "001_create_extra",
        up: "CREATE TABLE IF NOT EXISTS extra(id TEXT PRIMARY KEY, v TEXT)",
      },
      { id: "002_seed_extra", up: "INSERT OR IGNORE INTO extra(id, v) VALUES ('1','a')" },
    ];

    const first = await applyMigrations(migrations);
    expect(first.applied).toEqual(["001_create_extra", "002_seed_extra"]);
    expect(first.skipped).toEqual([]);

    const second = await applyMigrations(migrations);
    expect(second.applied).toEqual([]);
    expect(second.skipped).toEqual(["001_create_extra", "002_seed_extra"]);

    const rows = await getDb().all<{ id: string; v: string }>("SELECT * FROM extra");
    expect(rows).toEqual([{ id: "1", v: "a" }]);

    const applied = await listAppliedMigrations();
    expect(applied.map((m) => m.id)).toEqual(["001_create_extra", "002_seed_extra"]);
  });

  it("rejects modified migration content (checksum mismatch) without applying it", async () => {
    await applyMigrations([{ id: "001_x", up: "CREATE TABLE mx(id TEXT PRIMARY KEY)" }]);
    await expect(
      applyMigrations([{ id: "001_x", up: "CREATE TABLE mx(id TEXT PRIMARY KEY, extra TEXT)" }]),
    ).rejects.toThrow(/checksum mismatch/i);
  });

  it("rolls back a failed migration and does not record it", async () => {
    const bad = {
      id: "002_bad",
      up: "CREATE TABLE ok(id TEXT PRIMARY KEY); INSERT INTO nope VALUES (1);",
    };
    await expect(applyMigrations([bad])).rejects.toThrow();
    const applied = await listAppliedMigrations();
    expect(applied.find((m) => m.id === "002_bad")).toBeUndefined();
    // table from first statement should not persist because migration runs in a transaction
    const tables = await getDb().all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='ok'",
    );
    expect(tables).toHaveLength(0);
  });
});
