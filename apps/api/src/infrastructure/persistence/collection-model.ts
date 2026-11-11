import { defineModel } from "@moonwitness/orm";
import { ArtKeySchema } from "@moonwitness/schema/timeline";
import { z } from "zod";

export const CollectionSchema = z.object({
  name: z.string().min(1),
  episodes: z.number().int().default(0),
  cover: ArtKeySchema.default("hero-witness"),
  description: z.string().default(""),
});

export const collectionModel = defineModel({
  name: "publishing.collection",
  table: "collections",
  schema: CollectionSchema,
  softDelete: true,
  indexes: [
    { fields: ["name"] },
  ],
});

export type CollectionRecord = (typeof collectionModel)["type"];
export const collectionDdl = collectionModel.ddl;

