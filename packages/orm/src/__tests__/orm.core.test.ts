import { z } from "zod";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BaseRepository,
  ConflictError,
  closeDb,
  createActorContext,
  defineModel,
  getDb,
  initDb,
  uuidv7,
} from "../index.js";

const taskSchema = z.object({
  title: z.string(),
  priority: z.number().int(),
  ratio: z.number(),
  done: z.boolean(),
  due: z.date(),
  tags: z.array(z.string()),
  meta: z.object({ note: z.string() }).optional(),
  note: z.string().nullable(),
});

const taskModel = defineModel({
  name: "test.task",
  table: "test_tasks",
  schema: taskSchema,
  indexes: [{ fields: ["priority"] }, { fields: ["title"], unique: true }],
});

let dir: string;
const dirs: string[] = [];

function sample(overrides: Record<string, unknown> = {}) {
  return {
    title: "write tests",
    priority: 2,
    ratio: 0.5,
    done: false,
    due: new Date("2026-01-02T03:04:05.000Z"),
    tags: ["a", "b"],
    note: null,
    ...overrides,
  };
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "moonwitness-orm-"));
  dirs.push(dir);
  await initDb(join(dir, "orm.db"));
  await getDb().exec(taskModel.ddl);
});

afterEach(() => {
  closeDb();
});

afterAll(async () => {
  for (const path of dirs) {
    await rm(path, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }).catch(
      () => {},
    );
  }
});

describe("uuidv7", () => {
  it("produces version 7 ids with an RFC 4122 variant and monotonic timestamps", () => {
    const first = uuidv7();
    const second = uuidv7();

    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(second).not.toBe(first);
    expect(first.slice(0, 13) <= second.slice(0, 13)).toBe(true);
  });
});

describe("defineModel", () => {
  it("emits real business columns and correctly ordered unique indexes", () => {
    expect(taskModel.ddl).toContain('"title" TEXT NOT NULL');
    expect(taskModel.ddl).toContain('"priority" INTEGER NOT NULL');
    expect(taskModel.ddl).toContain('"ratio" REAL NOT NULL');
    expect(taskModel.ddl).toContain('"done" INTEGER NOT NULL');
    expect(taskModel.ddl).toContain('"due" TEXT NOT NULL');
    expect(taskModel.ddl).toContain('"tags" TEXT NOT NULL');
    expect(taskModel.ddl).toContain(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_test_tasks_title ON test_tasks (title)",
    );
    expect(taskModel.ddl).toContain(
      "CREATE INDEX IF NOT EXISTS idx_test_tasks_priority ON test_tasks (priority)",
    );
  });

  it("rejects unsafe table names", () => {
    expect(() =>
      defineModel({
        name: "bad",
        table: "bad; DROP TABLE x",
        schema: z.object({ title: z.string() }),
      }),
    ).toThrow(/Invalid table/);
  });

  it("rejects unsupported schema types instead of silently dropping them", () => {
    expect(() =>
      defineModel({
        name: "bad",
        table: "bad_types",
        schema: z.object({ when: z.union([z.string(), z.number()]) }),
      }),
    ).toThrow(/Unsupported schema type/);
  });
});

describe("BaseRepository", () => {
  it("roundtrips null, JSON, boolean, number and date values", async () => {
    const created = await taskModel.repository.create(sample());

    const loaded = await taskModel.repository.findOne(created.id);
    expect(loaded.title).toBe("write tests");
    expect(loaded.priority).toBe(2);
    expect(loaded.ratio).toBe(0.5);
    expect(loaded.done).toBe(false);
    expect(loaded.tags).toEqual(["a", "b"]);
    expect(loaded.note).toBeNull();
    expect(loaded.due).toBeInstanceOf(Date);
    expect(loaded.due.toISOString()).toBe("2026-01-02T03:04:05.000Z");
  });

  it("keeps an explicit business id and otherwise generates one", async () => {
    const explicit = await taskModel.repository.create(sample({ id: "task-1" }));
    const generated = await taskModel.repository.create(sample({ title: "other" }));

    expect(explicit.id).toBe("task-1");
    expect(generated.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("validates input against the schema before writing", async () => {
    await expect(taskModel.repository.create(sample({ priority: "high" }))).rejects.toThrow();
  });

  it("writes a CREATE audit entry in the same transaction", async () => {
    const created = await taskModel.repository.create(
      sample(),
      createActorContext("u1", "api", "req-1"),
    );
    const history = await taskModel.repository.history(created.id);

    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      model: "test.task",
      entity_id: created.id,
      action: "CREATE",
      changed_by: "u1",
      entity_version: 1,
      source: "api",
      request_id: "req-1",
    });
    expect(JSON.parse(history[0]!.diff).title).toEqual({ before: null, after: "write tests" });
  });

  it("increments the version and protects framework columns on update", async () => {
    const created = await taskModel.repository.create(sample());
    const updated = await taskModel.repository.update(created.id, {
      title: "ship it",
      version: 1,
      id: "hijacked",
      create_uid: "attacker",
      create_date: new Date("1999-01-01T00:00:00.000Z"),
      status: "deleted",
    });

    expect(updated.id).toBe(created.id);
    expect(updated.create_uid).toBeNull();
    expect(updated.create_date.toISOString()).toBe(created.create_date.toISOString());
    expect(updated.status).toBe("active");
    expect(updated.title).toBe("ship it");
    expect(updated.version).toBe(2);
  });

  it("rejects a stale version with ConflictError and leaves the record untouched", async () => {
    const created = await taskModel.repository.create(sample());
    await taskModel.repository.update(created.id, { title: "first", version: 1 });

    await expect(
      taskModel.repository.update(created.id, { title: "stale", version: 1 }),
    ).rejects.toBeInstanceOf(ConflictError);

    const reloaded = await taskModel.repository.findOne(created.id);
    expect(reloaded.title).toBe("first");
    expect(reloaded.version).toBe(2);
  });

  it("serializes concurrent updates so only one wins", async () => {
    const created = await taskModel.repository.create(sample());

    const results = await Promise.allSettled([
      taskModel.repository.update(created.id, { title: "left", version: 1 }),
      taskModel.repository.update(created.id, { title: "right", version: 1 }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const reloaded = await taskModel.repository.findOne(created.id);
    expect(reloaded.version).toBe(2);
    expect(["left", "right"]).toContain(reloaded.title);
  });

  it("rolls back the record change when the audit write fails", async () => {
    const created = await taskModel.repository.create(sample());
    await getDb().exec(`
      CREATE TRIGGER fail_audit BEFORE INSERT ON _orm_audit_log
      BEGIN
        SELECT RAISE(ABORT, 'audit unavailable');
      END;
    `);

    await expect(
      taskModel.repository.update(created.id, { title: "should not persist", version: 1 }),
    ).rejects.toThrow(/audit unavailable/);

    const reloaded = await taskModel.repository.findOne(created.id);
    expect(reloaded.title).toBe("write tests");
    expect(reloaded.version).toBe(1);
  });

  it("soft deletes, hides deleted rows by default, restores and records history", async () => {
    const created = await taskModel.repository.create(sample());

    await taskModel.repository.delete(created.id, createActorContext("u2", "api"));
    expect(await taskModel.repository.findOne(created.id)).toBeNull();
    expect(await taskModel.repository.find({}, { includeDeleted: true })).toHaveLength(1);

    await taskModel.repository.restore(created.id, createActorContext("u2", "api"));
    expect((await taskModel.repository.findOne(created.id))?.status).toBe("active");

    const history = await taskModel.repository.history(created.id);
    expect(history.map((entry) => entry.action)).toEqual(["CREATE", "DELETE", "RESTORE"]);
  });

  it("archives without clearing soft-delete fields", async () => {
    const created = await taskModel.repository.create(sample());
    const archived = await taskModel.repository.archive(created.id);

    expect(archived.status).toBe("archived");
    expect(archived.deleted_date).toBeNull();
  });

  it("rejects unknown filter columns instead of interpolating them", async () => {
    await expect(taskModel.repository.find({ "title = 'x' OR 1=1 --": "y" })).rejects.toThrow(
      /Invalid column/,
    );
    await expect(taskModel.repository.find({ nope: 1 })).rejects.toThrow(/Unknown column/);
  });

  it("persists across close and reopen of the same file", async () => {
    const dbPath = join(dir, "persist.db");
    closeDb();
    await initDb(dbPath);
    await getDb().exec(taskModel.ddl);

    const created = await taskModel.repository.create(sample());
    closeDb();
    await initDb(dbPath);

    const reloaded = await taskModel.repository.findOne(created.id);
    expect(reloaded.title).toBe("write tests");
    expect(reloaded.tags).toEqual(["a", "b"]);
  });
});

describe("driver lifecycle", () => {
  it("refuses to overwrite a live connection", async () => {
    await expect(initDb(join(dir, "second.db"))).rejects.toThrow(/already initialized/);
  });

  it("re-applies the audit table after a database was closed and reopened", async () => {
    const dbPath = join(dir, "reopen.db");
    closeDb();
    await initDb(dbPath);
    await getDb().exec(taskModel.ddl);

    const first = await taskModel.repository.create(sample());
    closeDb();
    await initDb(dbPath);

    const second = await taskModel.repository.create(sample({ title: "after reopen" }));
    expect(await taskModel.repository.history(first.id)).toHaveLength(1);
    expect(await taskModel.repository.history(second.id)).toHaveLength(1);
  });

  it("exposes the shared driver contract", async () => {
    const driver = getDb();
    expect(driver).toBeInstanceOf(Object);
    expect(typeof driver.run).toBe("function");
    expect(typeof driver.transaction).toBe("function");
  });
});

describe("BaseRepository type surface", () => {
  it("is exported as a usable constructor", () => {
    expect(typeof BaseRepository).toBe("function");
  });
});
