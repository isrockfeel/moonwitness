import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { closeDb, getDb, initDb } from "@moonwitness/orm";
import { registerTimelineAddon, timelineDdl } from "./index.js";

const DDL = timelineDdl;

let app: FastifyInstance;
let dir = "";

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "mw-addon-timeline-"));
  await initDb(join(dir, "addon.db"));
  await getDb().exec(DDL);
  app = Fastify();
  await registerTimelineAddon(app, { prefix: "/api/v1/timeline" });
  await app.ready();
});

afterEach(async () => {
  await app.close();
  closeDb();
});

const NOW = "2024-01-01T00:00:00.000Z";

async function insertEvent(id: string, era: string, date: string) {
  await getDb().run(
    `INSERT INTO timeline_events
     (id, kind, date, era, title, excerpt, body, location, tags, sources, notes, image, related,
      create_date, write_date, status, version, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      "PROJECT",
      date,
      era,
      "title",
      "ex",
      "body",
      "loc",
      "[]",
      0,
      0,
      "hero-witness",
      "[]",
      NOW,
      NOW,
      "active",
      1,
      "seed",
    ],
  );
}

describe("timeline addon routes (addon-owned)", () => {
  it("lists events from the addon route", async () => {
    await insertEvent("e1", "origins", "2021-01-01");
    await insertEvent("e2", "neon", "2022-01-01");

    const res = await app.inject({ method: "GET", url: "/api/v1/timeline/events" });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: Array<{ id: string }>; total: number };
    expect(body.total).toBe(2);
    expect(body.data.map((e) => e.id).sort()).toEqual(["e1", "e2"]);
  });

  it("returns a single event by id and 404 for unknown", async () => {
    await insertEvent("e1", "origins", "2021-01-01");
    const ok = await app.inject({ method: "GET", url: "/api/v1/timeline/events/e1" });
    expect(ok.statusCode).toBe(200);

    const missing = await app.inject({ method: "GET", url: "/api/v1/timeline/events/nope" });
    expect(missing.statusCode).toBe(404);
  });

  it("aggregates stats by era and kind", async () => {
    await insertEvent("e1", "origins", "2021-01-01");
    await insertEvent("e2", "origins", "2021-06-01");
    const res = await app.inject({ method: "GET", url: "/api/v1/timeline/stats" });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: { total: number; byEra: Record<string, number> } };
    expect(body.data.total).toBe(2);
    expect(body.data.byEra.origins).toBe(2);
  });

  it("lists eras", async () => {
    await getDb().run(
      `INSERT INTO timeline_eras (id, name, years, tagline, color, create_date, write_date, status, version, source) VALUES ('origins','Origins','2020','t','#fff', '2024-01-01', '2024-01-01', 'active', 1, 'seed')`,
    );
    const res = await app.inject({ method: "GET", url: "/api/v1/timeline/eras" });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { data: unknown[] }).data).toHaveLength(1);
  });
});
