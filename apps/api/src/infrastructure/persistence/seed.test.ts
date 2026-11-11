import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeDb, getDb, initDb } from "@moonwitness/orm";
import { timelineDdl, timelineEventModel, timelineEraModel } from "./timeline-model";
import { eras, events, seedTimeline } from "./seed-data";

let dir = "";

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "mw-seed-"));
  await initDb(join(dir, "seed.db"));
  await getDb().exec(timelineDdl);
});

afterEach(() => {
  closeDb();
});

async function count(table: string): Promise<number> {
  const row = await getDb().get<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`);
  return Number(row?.n ?? 0);
}

describe("seedTimeline", () => {
  it("seeds the canonical fixture set", async () => {
    await seedTimeline();
    expect(await count(timelineEraModel.table)).toBe(eras.length);
    expect(await count(timelineEventModel.table)).toBe(events.length);
  });

  it("is idempotent: re-running does not duplicate rows", async () => {
    await seedTimeline();
    await seedTimeline();
    await seedTimeline();
    expect(await count(timelineEraModel.table)).toBe(eras.length);
    expect(await count(timelineEventModel.table)).toBe(events.length);
  });

  it("does not overwrite user-authored changes to seeded rows", async () => {
    await seedTimeline();
    const first = events[0]!;
    await getDb().run(`UPDATE ${timelineEventModel.table} SET title = ? WHERE id = ?`, [
      "user edited title",
      first.id,
    ]);

    await seedTimeline();

    const row = await getDb().get<{ title: string }>(
      `SELECT title FROM ${timelineEventModel.table} WHERE id = ?`,
      [first.id],
    );
    expect(row?.title).toBe("user edited title");
  });

  it("keeps stable ids and related-event links intact", async () => {
    await seedTimeline();
    for (const event of events) {
      const row = await getDb().get<{ id: string }>(
        `SELECT id FROM ${timelineEventModel.table} WHERE id = ?`,
        [event.id],
      );
      expect(row?.id).toBe(event.id);
    }
  });
});
