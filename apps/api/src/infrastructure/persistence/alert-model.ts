import { defineModel } from "@moonwitness/orm";
import { z } from "zod";

export const AlertSchema = z.object({
  title: z.string().default(""),
  text: z.string().min(1),
  level: z.enum(["high", "medium", "low"]).default("medium"),
  ago: z.string().default("just now"),
  dismissed: z.boolean().default(false),
});

export const alertModel = defineModel({
  name: "mission.alert",
  table: "mission_alerts",
  schema: AlertSchema,
  softDelete: true,
  indexes: [
    { fields: ["dismissed"] },
    { fields: ["level"] },
  ],
});

export type AlertRecord = (typeof alertModel)["type"];
export const alertDdl = alertModel.ddl;

