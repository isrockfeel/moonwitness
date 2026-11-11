import { defineModel } from "@moonwitness/orm";
import { z } from "zod";

export const FeedItemSchema = z.object({
  text: z.string().min(1),
  ago: z.string().default("just now"),
  color: z.string().default("#2ea8ff"),
  timestamp: z.string().default(""),
});

export const feedItemModel = defineModel({
  name: "feed.item",
  table: "feed_items",
  schema: FeedItemSchema,
  softDelete: true,
  indexes: [
    { fields: ["create_date"] },
  ],
});

export type FeedItemRecord = (typeof feedItemModel)["type"];
export const feedItemDdl = feedItemModel.ddl;

