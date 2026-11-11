import { defineModel } from "@moonwitness/orm";
import { TimelineEventSchema, EraSchema } from "@moonwitness/schema/timeline";

export const timelineEventModel = defineModel({
  name: "timeline.event",
  table: "timeline_events",
  schema: TimelineEventSchema,
  softDelete: true,
  indexes: [{ fields: ["era"] }, { fields: ["kind"] }, { fields: ["date"] }],
});

export const timelineEraModel = defineModel({
  name: "timeline.era",
  table: "timeline_eras",
  schema: EraSchema,
  softDelete: true,
});

export const timelineDdl = [timelineEventModel.ddl, timelineEraModel.ddl].join(";\n");

export type TimelineEventRecord = (typeof timelineEventModel)["type"];
export type TimelineEraRecord = (typeof timelineEraModel)["type"];
