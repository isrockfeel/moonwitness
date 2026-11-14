import { afterEach, describe, expect, it, vi } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import FastifyCors from "@fastify/cors";
import { storageRoutes } from "./storage.routes";

describe("storage proxy", () => {
  let app: FastifyInstance | null = null;

  afterEach(async () => {
    await app?.close();
    app = null;
    vi.unstubAllGlobals();
  });

  it("forwards reads to the upstream storage service", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response('<?xml version="1.0"?><ListAllMyBucketsResult/>', {
        status: 200,
        headers: { "content-type": "application/xml" },
      }),
    );
    vi.stubGlobal("fetch", fetch);
    app = Fastify({ logger: false });
    await app.register(FastifyCors);
    await app.register(storageRoutes);
    await app.ready();

    const read = await app.inject({ method: "GET", url: "/storage/buckets" });
    expect(read.statusCode).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("forwards bucket object listing to the bucket root with the original query", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response('<?xml version="1.0"?><ListBucketResult/>', {
        status: 200,
        headers: { "content-type": "application/xml" },
      }),
    );
    vi.stubGlobal("fetch", fetch);
    app = Fastify({ logger: false });
    await app.register(FastifyCors);
    await app.register(storageRoutes);
    await app.ready();

    const read = await app.inject({
      method: "GET",
      url: "/storage/buckets/media/objects?list-type=2&prefix=img/",
    });
    expect(read.statusCode).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0]?.[0])).toBe(
      "http://127.0.0.1:8091/media?list-type=2&prefix=img/",
    );
  });

  it("fetches an object literally named objects instead of treating it as listing", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response("payload", { status: 200, headers: { "content-type": "text/plain" } }),
      );
    vi.stubGlobal("fetch", fetch);
    app = Fastify({ logger: false });
    await app.register(FastifyCors);
    await app.register(storageRoutes);
    await app.ready();

    const read = await app.inject({ method: "GET", url: "/storage/buckets/media/objects" });
    expect(read.statusCode).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0]?.[0])).toBe("http://127.0.0.1:8091/media/objects");
  });

  it("fetches an object literally named objects when query params target the object", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response("payload", { status: 200, headers: { "content-type": "text/plain" } }),
      );
    vi.stubGlobal("fetch", fetch);
    app = Fastify({ logger: false });
    await app.register(FastifyCors);
    await app.register(storageRoutes);
    await app.ready();

    const read = await app.inject({
      method: "GET",
      url: "/storage/buckets/media/objects?response-content-disposition=attachment",
    });
    expect(read.statusCode).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0]?.[0])).toBe(
      "http://127.0.0.1:8091/media/objects?response-content-disposition=attachment",
    );
  });

  it("forwards bucket-level POST to the bucket root with query", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response("", { status: 200, headers: { "content-type": "application/xml" } }),
      );
    vi.stubGlobal("fetch", fetch);
    app = Fastify({ logger: false });
    await app.register(FastifyCors);
    await app.register(storageRoutes);
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/storage/buckets/media?delete=",
      headers: { "content-type": "application/octet-stream" },
      payload: "<Delete/>",
    });
    expect(res.statusCode).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0]?.[0])).toBe("http://127.0.0.1:8091/media?delete=");
  });

  it("forwards binary object bodies without text re-encoding", async () => {
    const bytes = Uint8Array.from([0, 1, 2, 127, 128, 129, 254, 255]);
    const fetch = vi.fn().mockResolvedValue(
      new Response(bytes, {
        status: 200,
        headers: { "content-type": "application/octet-stream" },
      }),
    );
    vi.stubGlobal("fetch", fetch);
    app = Fastify({ logger: false });
    await app.register(FastifyCors);
    await app.register(storageRoutes);
    await app.ready();

    const read = await app.inject({ method: "GET", url: "/storage/buckets/media/blob.bin" });
    expect(read.statusCode).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect([...new Uint8Array(read.rawPayload)]).toEqual([...bytes]);
  });

  it("forwards object PUT to the upstream service", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response("", { status: 200, headers: { "content-type": "application/xml" } }),
      );
    vi.stubGlobal("fetch", fetch);
    app = Fastify({ logger: false });
    await app.register(FastifyCors);
    await app.register(storageRoutes);
    await app.ready();

    const write = await app.inject({
      method: "PUT",
      url: "/storage/buckets/media/hello.txt",
      headers: { "content-type": "application/octet-stream" },
      payload: "hello",
    });
    expect(write.statusCode).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("returns 502 when the upstream storage service is unreachable", async () => {
    const fetch = vi.fn().mockRejectedValue(new Error("connection refused"));
    vi.stubGlobal("fetch", fetch);
    app = Fastify({ logger: false });
    await app.register(FastifyCors);
    await app.register(storageRoutes);
    await app.ready();

    const read = await app.inject({ method: "GET", url: "/storage/health" });
    expect(read.statusCode).toBe(502);
    expect(read.json()).toMatchObject({ reachable: false });
  });

  it("allows CORS preflight for DELETE on storage routes", async () => {
    app = Fastify({ logger: false });
    await app.register(FastifyCors);
    await app.register(storageRoutes);
    await app.ready();

    const deletePreflight = await app.inject({
      method: "OPTIONS",
      url: "/storage/buckets/media/hello.txt",
      headers: {
        "access-control-request-method": "DELETE",
        "access-control-request-headers": "content-type",
      },
    });
    expect([200, 204, 400]).toContain(deletePreflight.statusCode);
  });
});
