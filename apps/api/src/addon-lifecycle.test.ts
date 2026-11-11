import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app";
import { AddonRegistry, AddonRegistryError } from "@moonwitness/addon-base/registry";

const dirs: string[] = [];
let dir = "";

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "mw-addon-lifecycle-"));
  dirs.push(dir);
});

afterAll(async () => {
  for (const path of dirs) {
    await rm(path, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }).catch(
      () => {},
    );
  }
});

describe("addon startup lifecycle", () => {
  it("loads __base before the dependent timeline addon", async () => {
    const registry = new AddonRegistry();
    const order: string[] = [];
    registry.add({
      manifest: {
        name: "__base",
        version: "0.1.0",
        depends: [],
        provides: { routes: ["health"] },
      },
      register: (ctx) => {
        order.push(["__base", ctx.loaded.join(",")].join(":"));
      },
    });
    registry.add({
      manifest: {
        name: "timeline",
        version: "0.1.0",
        depends: ["__base"],
        provides: { routes: ["timeline"], models: ["timeline.event"] },
      },
      register: (ctx) => {
        order.push(["timeline", ctx.loaded.join(",")].join(":"));
      },
    });

    expect(registry.resolveOrder()).toEqual(["__base", "timeline"]);
    await registry.load();
    expect(order[0]).toBe("__base:");
    expect(order[1]).toBe("timeline:__base");
  });

  it("fails startup with actionable diagnostics on a missing dependency", () => {
    const registry = new AddonRegistry();
    registry.add({
      manifest: { name: "timeline", version: "0.1.0", depends: ["ghost"], provides: {} },
      register: () => {},
    });

    expect(() => registry.validate()).toThrow(AddonRegistryError);
    expect(() => registry.validate()).toThrow(/Missing addon dependency 'ghost'/);
  });

  it("fails startup on a dependency cycle", () => {
    const registry = new AddonRegistry();
    registry.add({
      manifest: { name: "a", version: "1", depends: ["b"], provides: {} },
      register: () => {},
    });
    registry.add({
      manifest: { name: "b", version: "1", depends: ["a"], provides: {} },
      register: () => {},
    });

    expect(() => registry.validate()).toThrow(/Circular addon dependency/);
  });

  it("fails startup when two addons claim the same route", async () => {
    const registry = new AddonRegistry();
    registry.add({
      manifest: { name: "__base", version: "0.1.0", depends: [], provides: { routes: ["health"] } },
      register: () => {},
    });
    registry.add({
      manifest: {
        name: "clone",
        version: "0.1.0",
        depends: ["__base"],
        provides: { routes: ["health"] },
      },
      register: () => {},
    });

    await expect(registry.load()).rejects.toThrow(/already claimed by another addon/);
  });

  it("keeps the timeline manifest and the base manifest collision-free", () => {
    const registry = new AddonRegistry();
    registry.add({
      manifest: {
        name: "__base",
        version: "0.1.0",
        depends: [],
        provides: { routes: ["health", "_meta"] },
      },
      register: () => {},
    });
    registry.add({
      manifest: {
        name: "timeline",
        version: "0.1.0",
        depends: ["__base"],
        provides: { routes: ["timeline"], models: ["timeline.event"] },
      },
      register: () => {},
    });

    expect(() => registry.validate()).not.toThrow();
    expect(registry.resolveOrder()).toEqual(["__base", "timeline"]);
  });
});

describe("single timeline route implementation", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp({ dbPath: join(dir, "routes.db") });
  });

  afterEach(async () => {
    await app.close();
  });

  it("serves timeline endpoints only under the API prefix", async () => {
    const prefixed = await app.inject({ method: "GET", url: "/api/v1/timeline/events" });
    expect(prefixed.statusCode).toBe(200);

    for (const url of ["/timeline/events", "/events", "/api/v1/events"]) {
      const response = await app.inject({ method: "GET", url });
      expect(response.statusCode).toBe(404);
    }
  });

  it("does not double-mount the prefix", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/timeline/stats" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty("data.total");

    const doubled = await app.inject({ method: "GET", url: "/api/v1/api/v1/timeline/stats" });
    expect(doubled.statusCode).toBe(404);
  });

  it("keeps health endpoints outside the timeline addon", async () => {
    const inside = await app.inject({ method: "GET", url: "/api/v1/healthz" });
    expect(inside.statusCode).toBe(200);

    const underTimeline = await app.inject({ method: "GET", url: "/api/v1/timeline/healthz" });
    expect(underTimeline.statusCode).toBe(404);
  });
});
