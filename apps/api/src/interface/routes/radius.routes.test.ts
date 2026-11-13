import { afterEach, describe, expect, it, vi } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { radiusRoutes } from "./radius.routes";

describe("RADIUS proxy authorization", () => {
  let app: FastifyInstance | null = null;

  afterEach(async () => {
    await app?.close();
    app = null;
    vi.unstubAllGlobals();
  });

  it("denies unauthenticated reads and writes before contacting the service", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    app = Fastify({ logger: false });
    await app.register(radiusRoutes);
    await app.ready();

    const read = await app.inject({ method: "GET", url: "/radius/users" });
    const write = await app.inject({ method: "POST", url: "/radius/users", payload: {} });
    expect(read.statusCode).toBe(401);
    expect(write.statusCode).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
});
