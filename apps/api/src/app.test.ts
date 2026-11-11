import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app";
import { seedTimeline } from "./infrastructure/persistence/seed-data";

let app: FastifyInstance;
let dbDir: string;
let dbPath: string;
const dirs: string[] = [];

beforeEach(async () => {
  dbDir = await mkdtemp(join(tmpdir(), "moonwitness-api-"));
  dirs.push(dbDir);
  dbPath = join(dbDir, "timeline.db");
  app = await buildApp({ dbPath, prefix: "/api/v1" });
  await seedTimeline();
});

afterEach(async () => {
  await app.close();
});

afterAll(async () => {
  for (const path of dirs) {
    await rm(path, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }).catch(
      () => {},
    );
  }
});

describe("addon registry wiring", () => {
  it("serves __base health and metadata endpoints loaded through the registry", async () => {
    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({ status: "ok" });

    const models = await app.inject({ method: "GET", url: "/_meta/models" });
    expect(models.statusCode).toBe(200);
    expect(Array.isArray(models.json().models)).toBe(true);
  });
});

describe("timeline API", () => {
  it("returns an empty list on a fresh database", async () => {
    await app.close();
    app = await buildApp({ dbPath: join(dbDir, "fresh.db"), prefix: "/api/v1" });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/timeline/events",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: [], total: 0 });
  });

  it("lists seeded events with the correct total", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/timeline/events",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { data: unknown[]; total: number };
    expect(body.total).toBe(5);
    expect(body.data).toHaveLength(5);
  });

  it("returns a stored event by id with arrays and numbers intact", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/timeline/events/evt-002",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      data: { title: string; tags: string[]; sources: number; related: string[] };
    };
    expect(body.data.title).toBe("Signal in the Fog");
    expect(body.data.tags).toEqual(["signal", "voice"]);
    expect(body.data.sources).toBe(4);
    expect(body.data.related).toEqual(["evt-001", "evt-003"]);
  });

  it("returns 404 for an unknown event id", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/timeline/events/does-not-exist",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "TimelineEvent with id 'does-not-exist' not found",
    });
  });

  it("filters by era and reports total for the filtered set, not the page", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/timeline/events?era=origins&limit=1",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { data: { id: string }[]; total: number };
    expect(body.total).toBe(1);
    expect(body.data.map((event) => event.id)).toEqual(["evt-001"]);
  });

  it("paginates with offset after filtering", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/timeline/events?limit=2&offset=2",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { data: { id: string }[]; total: number };
    expect(body.total).toBe(5);
    expect(body.data.map((event) => event.id)).toEqual(["evt-003", "evt-004"]);
  });

  it("filters by inclusive date range", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/timeline/events?from=2022-01-01&to=2024-12-31",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { data: { id: string }[]; total: number };
    expect(body.data.map((event) => event.id)).toEqual(["evt-002", "evt-003"]);
    expect(body.total).toBe(2);
  });

  it("aggregates stats by era and kind", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/timeline/stats",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      data: {
        total: number;
        byEra: Record<string, number>;
        byKind: Record<string, number>;
      };
    };
    expect(body.data.total).toBe(5);
    expect(body.data.byEra).toEqual({
      origins: 1,
      neon: 1,
      fracture: 1,
      rebuilding: 1,
      expansions: 1,
    });
    expect(body.data.byKind).toEqual({
      PROJECT: 1,
      STORY: 1,
      WORLD: 1,
      PEOPLE: 1,
      RESEARCH: 1,
    });
  });

  it("returns eras with their display metadata", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/timeline/eras",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      data: { id: string; name: string; years: string; color: string }[];
    };
    expect(body.data).toHaveLength(5);
    expect(body.data.find((era) => era.id === "origins")).toEqual({
      id: "origins",
      name: "Origins",
      years: "2020-2022",
      tagline: "The first witnesses.",
      color: "#3b82f6",
    });
  });

  it("rejects an out-of-range limit with 400", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/timeline/events?limit=500",
    });

    expect(response.statusCode).toBe(400);
  });

  it("ignores a spoofed actor header and still serves public reads", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/timeline/events/evt-001",
      headers: { "x-actor-id": "attacker" },
    });

    expect(response.statusCode).toBe(200);
  });

  it("persists data across an app restart on the same file", async () => {
    await app.close();
    app = await buildApp({ dbPath, prefix: "/api/v1" });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/timeline/events",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { data: unknown[]; total: number };
    expect(body.total).toBe(5);
  });
});
