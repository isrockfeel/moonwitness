import { defineModel } from "@moonwitness/orm";
import { TimelineEventSchema, EraSchema } from "@moonwitness/schema/timeline";
import type { z } from "zod";

// zod 3.25's ZodObject generics are invariant across the `any` constraint,
// so callers need one boundary cast when handing a concrete shape to defineModel.
type ModelShape = z.ZodObject<any, any>;

export const timelineEventModel = defineModel({
  name: "timeline.event",
  table: "timeline_events",
  schema: TimelineEventSchema as unknown as ModelShape,
  softDelete: true,
  indexes: [
    { fields: ["era"] },
    { fields: ["kind"] },
    { fields: ["date"] },
  ],
});

export const timelineEraModel = defineModel({
  name: "timeline.era",
  table: "timeline_eras",
  schema: EraSchema as unknown as ModelShape,
  softDelete: true,
});

export const timelineDdl = [
  timelineEventModel.ddl,
  timelineEraModel.ddl,
].join(";\n");

export type TimelineEventRecord = (typeof timelineEventModel)["type"];
export type TimelineEraRecord = (typeof timelineEraModel)["type"];