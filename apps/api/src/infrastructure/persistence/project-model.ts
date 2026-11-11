import { defineModel } from "@moonwitness/orm";
import { ArtKeySchema } from "@moonwitness/schema/timeline";
import { z } from "zod";

export const ProjectSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  stage: z.enum(["DRAFT", "IN_REVIEW", "APPROVED", "PUBLISHED"]).default("DRAFT"),
  progress: z.number().int().min(0).max(100).default(0),
  color: z.string().default("#2ea8ff"),
  image: ArtKeySchema.default("hero-witness"),
  imagePosition: z.string().default("50% 50%"),
  kind: z.enum(["PROJECT", "STORY", "SIGNAL", "WORLD", "PEOPLE", "RESEARCH"]).default("PROJECT"),
});

export const projectModel = defineModel({
  name: "creative.project",
  table: "projects",
  schema: ProjectSchema,
  softDelete: true,
  indexes: [
    { fields: ["stage"] },
    { fields: ["kind"] },
  ],
});

export type ProjectRecord = (typeof projectModel)["type"];
export const projectDdl = projectModel.ddl;

