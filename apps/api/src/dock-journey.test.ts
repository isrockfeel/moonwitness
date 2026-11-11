import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app";
import { seedTimeline } from "@moonwitness/addon-timeline";

let app: FastifyInstance;
let dbDir = "";

beforeEach(async () => {
  dbDir = await mkdtemp(join(tmpdir(), "mw-dock-journey-"));
  app = await buildApp({ dbPath: join(dbDir, "dock.db"), prefix: "/api/v1" });
  await seedTimeline();
});

afterEach(async () => {
  await app.close();
});

afterAll(() => {
  /* temp dirs are OS-cleaned; DB closed via app.close() */
});

/**
 * Proves the data contract behind the Dock's main journey:
 * list → filter by era → open detail → follow a related event.
 */
describe("Dock journey contract", () => {
  it("supports list → filter → detail → related navigation", async () => {
    // 1. List
    const list = await app.inject({ method: "GET", url: "/api/v1/timeline/events" });
    expect(list.statusCode).toBe(200);
    const listed = list.json() as {
      data: Array<{ id: string; era: string; related: string[] }>;
      total: number;
    };
    expect(listed.total).toBeGreaterThan(0);

    // 2. Filter by era
    const filtered = await app.inject({ method: "GET", url: "/api/v1/timeline/events?era=neon" });
    expect(filtered.statusCode).toBe(200);
    const filteredBody = filtered.json() as {
      data: Array<{ id: string; era: string }>;
      total: number;
    };
    expect(filteredBody.total).toBeGreaterThan(0);
    expect(filteredBody.data.every((event) => event.era === "neon")).toBe(true);

    // 3. Open detail of the first filtered event
    const target = filteredBody.data[0]!;
    const detail = await app.inject({ method: "GET", url: `/api/v1/timeline/events/${target.id}` });
    expect(detail.statusCode).toBe(200);
    const detailBody = detail.json() as { data: { id: string; related: string[] } };
    expect(detailBody.data.id).toBe(target.id);

    // 4. Follow a related event (must resolve to a real, fetchable record)
    const relatedId = detailBody.data.related[0];
    expect(relatedId).toBeDefined();
    const related = await app.inject({
      method: "GET",
      url: `/api/v1/timeline/events/${relatedId}`,
    });
    expect(related.statusCode).toBe(200);
    expect((related.json() as { data: { id: string } }).data.id).toBe(relatedId);
  });

  it("returns 404 for a detail id that does not exist (shareable URL miss)", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/timeline/events/not-real" });
    expect(response.statusCode).toBe(404);
  });

  it("rejects an out-of-range limit so bad shareable URLs fail predictably", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/timeline/events?limit=999" });
    expect(response.statusCode).toBe(400);
  });
});
