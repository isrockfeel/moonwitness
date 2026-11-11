import { defineModel } from "@moonwitness/orm";
import { z } from "zod";

export const ModuleStatSchema = z.object({
  label: z.string(),
  value: z.number(),
  color: z.string(),
});

export const ModuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  color: z.string().default("#2ea8ff"),
  icon: z.string().default("terminal"),
  stats: z.array(ModuleStatSchema).default([]),
  orderIndex: z.number().int().default(0),
});

export const moduleModel = defineModel({
  name: "creative.module",
  table: "creative_modules",
  schema: ModuleSchema,
  softDelete: true,
  indexes: [
    { fields: ["orderIndex"] },
  ],
});

export type ModuleRecord = (typeof moduleModel)["type"];
export const moduleDdl = moduleModel.ddl;

