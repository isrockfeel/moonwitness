import { defineModel } from "@moonwitness/orm";
import { z } from "zod";

export const WitnessSchema = z.object({
  name: z.string().min(1),
  place: z.string(),
  x: z.number(),
  y: z.number(),
  quote: z.string().default(""),
  signals: z.number().int().default(0),
});

export const witnessModel = defineModel({
  name: "network.witness",
  table: "witnesses",
  schema: WitnessSchema,
  softDelete: true,
  indexes: [
    { fields: ["place"] },
  ],
});

export type WitnessRecord = (typeof witnessModel)["type"];
export const witnessDdl = witnessModel.ddl;

