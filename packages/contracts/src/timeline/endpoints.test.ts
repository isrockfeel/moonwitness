import { describe, expect, it } from "vitest";
import {
  ApiErrorSchema,
  TimelineEndpoint,
  TimelineListQuerySchema,
  TimelineListResponseSchema,
  TimelineStatsSchema,
} from "./endpoints.js";

const event = {
  id: "evt-1",
  kind: "PROJECT" as const,
  date: "2021-03-12",
  era: "origins" as const,
  title: "First Witness Station",
  excerpt: "We lit the first relay.",
  body: "The station came online.",
  location: "Rooftop",
  tags: ["station"],
  sources: 2,
  notes: 1,
  image: "hero-witness" as const,
  related: ["evt-2"],
};

describe("timeline contracts", () => {
  it("accepts a canonical event response", () => {
    const parsed = TimelineListResponseSchema.parse({ data: [event], total: 1 });
    expect(parsed.data[0]!.id).toBe("evt-1");
    expect(parsed.total).toBe(1);
  });

  it("rejects an event with an invalid era or kind", () => {
    expect(() =>
      TimelineListResponseSchema.parse({ data: [{ ...event, era: "nope" }], total: 1 }),
    ).toThrow();
    expect(() =>
      TimelineListResponseSchema.parse({ data: [{ ...event, kind: "NOPE" }], total: 1 }),
    ).toThrow();
  });

  it("validates list query bounds and rejects unknown fields", () => {
    expect(TimelineListQuerySchema.parse({ limit: 100, offset: 0 }).limit).toBe(100);
    expect(() => TimelineListQuerySchema.parse({ limit: 101 })).toThrow();
    expect(() => TimelineListQuerySchema.parse({ limit: 0 })).toThrow();
    expect(() => TimelineListQuerySchema.parse({ offset: -1 })).toThrow();
    expect(() => TimelineListQuerySchema.parse({ bogus: "x" })).toThrow();
  });

  it("types stats aggregates as non-negative integers", () => {
    expect(TimelineStatsSchema.parse({ total: 5, byEra: { origins: 1 }, byKind: { PROJECT: 1 } }))
      .toBeTruthy();
    expect(() =>
      TimelineStatsSchema.parse({ total: 5, byEra: { origins: -1 }, byKind: {} }),
    ).toThrow();
  });

  it("exposes an error envelope and concrete endpoint schemas (no z.any)", () => {
    expect(ApiErrorSchema.parse({ error: "boom" }).error).toBe("boom");
    const json = JSON.stringify(Object.keys(TimelineEndpoint));
    expect(json).toContain("listEvents");
    // Response schemas must be concrete Zod objects, not z.any() passthroughs.
    expect(TimelineEndpoint.listEvents.response._def.typeName).toBe("ZodObject");
    expect(TimelineEndpoint.getEvent.response._def.typeName).toBe("ZodObject");
    expect(TimelineEndpoint.getStats.response._def.typeName).toBe("ZodObject");
    expect(TimelineEndpoint.getEras.response._def.typeName).toBe("ZodObject");
  });
});
