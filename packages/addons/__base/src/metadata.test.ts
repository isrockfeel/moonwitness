import { describe, expect, it, vi } from "vitest";
import { createMetadataRegistry, registerMetadataRoutes } from "./metadata.js";

function fakeFastify() {
  const routes = new Map<string, (request: unknown, reply: unknown) => unknown>();
  const fastify = {
    get: (path: string, handler: (request: unknown, reply: unknown) => unknown) => {
      routes.set(path, handler);
    },
  };
  return { fastify, routes };
}

function fakeReply() {
  const reply = {
    code: vi.fn(() => reply),
    send: vi.fn((body: unknown) => body),
    type: vi.fn(() => reply),
  };
  return reply;
}

describe("metadata registry", () => {
  it("rejects duplicate model names", () => {
    expect(() =>
      createMetadataRegistry([
        { name: "a", publicFields: [] },
        { name: "a", publicFields: [] },
      ]),
    ).toThrow(/Duplicate metadata model/);
  });
});

describe("registerMetadataRoutes", () => {
  it("lists only registered models", async () => {
    const { fastify, routes } = fakeFastify();
    await registerMetadataRoutes(
      fastify as never,
      createMetadataRegistry([
        { name: "timeline.event", publicFields: [{ name: "title", type: "string" }] },
      ]),
    );
    const list = (await routes.get("/_meta/models")!({}, fakeReply())) as { models: string[] };
    expect(list.models).toEqual(["timeline.event"]);
  });

  it("exposes only approved fields for a model", async () => {
    const { fastify, routes } = createRoutes();
    const handler = routes.get("/_meta/models/:name")!;
    const reply = fakeReply();
    const result = (await handler({ params: { name: "timeline.event" } }, reply)) as {
      fields: { name: string }[];
    };
    expect(result.fields.map((f) => f.name)).toEqual(["title", "date"]);
  });

  it("returns 404 for unknown models", async () => {
    const { fastify, routes } = fakeFastify();
    await registerMetadataRoutes(fastify as never, createMetadataRegistry([]));
    const reply = fakeReply();
    await routes.get("/_meta/models/:name")!({ params: { name: "nope" } }, reply);
    expect(reply.code).toHaveBeenCalledWith(404);
  });
});

function createRoutes() {
  const { fastify, routes } = fakeFastify();
  void registerMetadataRoutes(
    fastify as never,
    createMetadataRegistry([
      {
        name: "timeline.event",
        publicFields: [
          { name: "title", type: "string" },
          { name: "date", type: "string" },
        ],
      },
    ]),
  );
  return { fastify, routes };
}
