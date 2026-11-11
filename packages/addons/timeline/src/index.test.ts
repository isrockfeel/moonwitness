import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { closeDb, getDb, initDb } from "@moonwitness/orm";
import { registerTimelineAddon } from "./index.js";

const DDL = `
CREATE TABLE IF NOT EXISTS timeline_events (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL, date TEXT NOT NULL, era TEXT NOT NULL,
  title TEXT NOT NULL, excerpt TEXT NOT NULL, body TEXT NOT NULL, location TEXT NOT NULL,
  tags TEXT NOT NULL, sources INTEGER NOT NULL, notes INTEGER NOT NULL, image TEXT NOT NULL,
  imagePosition TEXT, related TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active'
);
CREATE TABLE IF NOT EXISTS eras (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, years TEXT NOT NULL, tagline TEXT NOT NULL, color TEXT NOT NULL
);
`;

let app: FastifyInstance;
let dir = "";

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "mw-addon-timeline-"));
  await initDb(join(dir, "addon.db"));
  await getDb().exec(DDL);
  app = Fastify();
  await registerTimelineAddon(app);
  await app.ready();
});

afterEach(async () => {
  await app.close();
  closeDb();
});

async function insertEvent(id: string, era: string, date: string) {
  await getDb().run(
    `INSERT INTO timeline_events
     (id, kind, date, era, title, excerpt, body, location, tags, sources, notes, image, related, status)
     VALUES (?, 'PROJECT', ?, ?, 'title', 'ex', 'body', 'loc', '[]', 0, 0, 'hero-witness', '[]', 'active')`,
    [id, date, era],
  );
}

describe("timeline addon routes (addon-owned)", () => {
  it("lists events from the addon route", async () => {
    await insertEvent("e1", "origins", "2021-01-01");
    await insertEvent("e2", "neon", "2022-01-01");

    const res = await app.inject({ method: "GET", url: "/events" });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: Array<{ id: string }>; total: number };
    expect(body.total).toBe(2);
    expect(body.data.map((e) => e.id).sort()).toEqual(["e1", "e2"]);
  });

  it("returns a single event by id and 404 for unknown", async () => {
    await insertEvent("e1", "origins", "2021-01-01");
    const ok = await app.inject({ method: "GET", url: "/events/e1" });
    expect(ok.statusCode).toBe(200);

    const missing = await app.inject({ method: "GET", url: "/events/nope" });
    expect(missing.statusCode).toBe(404);
  });

  it("aggregates stats by era and kind", async () => {
    await insertEvent("e1", "origins", "2021-01-01");
    await insertEvent("e2", "origins", "2021-06-01");
    const res = await app.inject({ method: "GET", url: "/stats" });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { total: number; byEra: Record<string, number> };
    expect(body.total).toBe(2);
    expect(body.byEra.origins).toBe(2);
  });

  it("lists eras", async () => {
    await getDb().run(
      "INSERT INTO eras (id, name, years, tagline, color) VALUES ('origins','Origins','2020','t','#fff')",
    );
    const res = await app.inject({ method: "GET", url: "/eras" });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { data: unknown[] }).data).toHaveLength(1);
  });
});
