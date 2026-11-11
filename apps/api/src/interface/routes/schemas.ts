export const listTimelineQuerySchema = {
  type: "object",
  properties: {
    era: { type: "string" },
    kind: { type: "string" },
    from: { type: "string" },
    to: { type: "string" },
    limit: { type: "integer", minimum: 1, maximum: 100 },
    offset: { type: "integer", minimum: 0 },
  },
} as const;

export const timelineEventSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    kind: { type: "string" },
    date: { type: "string" },
    era: { type: "string" },
    title: { type: "string" },
    excerpt: { type: "string" },
    body: { type: "string" },
    location: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    sources: { type: "integer" },
    notes: { type: "integer" },
    image: { type: "string" },
    imagePosition: { type: "string" },
    related: { type: "array", items: { type: "string" } },
  },
  required: [
    "id",
    "kind",
    "date",
    "era",
    "title",
    "excerpt",
    "body",
    "location",
    "tags",
    "sources",
    "notes",
    "image",
    "related",
  ],
} as const;

export const timelineEventListResponseSchema = {
  type: "object",
  properties: {
    data: { type: "array", items: timelineEventSchema },
    total: { type: "integer" },
  },
  required: ["data", "total"],
} as const;

export const timelineEventResponseSchema = {
  type: "object",
  properties: {
    data: timelineEventSchema,
  },
  required: ["data"],
} as const;

export const timelineStatsSchema = {
  type: "object",
  properties: {
    total: { type: "integer" },
    byEra: { type: "object" },
    byKind: { type: "object" },
  },
  required: ["total", "byEra", "byKind"],
} as const;

export const timelineStatsResponseSchema = {
  type: "object",
  properties: {
    data: timelineStatsSchema,
  },
  required: ["data"],
} as const;

export const eraSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    years: { type: "string" },
    tagline: { type: "string" },
    color: { type: "string" },
  },
  required: ["id", "name", "years", "tagline", "color"],
} as const;

export const eraResponseSchema = {
  type: "object",
  properties: {
    data: { type: "array", items: eraSchema },
  },
  required: ["data"],
} as const;

export const errorResponseSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
  },
} as const;

export const paramIdSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
  },
  required: ["id"],
} as const;