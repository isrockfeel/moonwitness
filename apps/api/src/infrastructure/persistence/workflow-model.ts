import { defineModel } from "@moonwitness/orm";
import { z } from "zod";

export const WorkflowSchema = z.object({
  name: z.string().min(1),
  moduleId: z.string().min(1),
  detail: z.string().default(""),
  state: z.enum(["Running", "Queued", "Paused"]).default("Queued"),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
});

export const workflowModel = defineModel({
  name: "automation.workflow",
  table: "workflows",
  schema: WorkflowSchema,
  softDelete: true,
  indexes: [
    { fields: ["moduleId"] },
    { fields: ["state"] },
  ],
});

export const WorkflowRunSchema = z.object({
  workflowId: z.string().min(1),
  state: z.enum(["Running", "Queued", "Paused", "Completed", "Failed"]).default("Queued"),
  logs: z.array(z.string()).default([]),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
});

export const workflowRunModel = defineModel({
  name: "automation.workflow_run",
  table: "workflow_runs",
  schema: WorkflowRunSchema,
  softDelete: true,
  indexes: [
    { fields: ["workflowId"] },
    { fields: ["state"] },
  ],
});

export type WorkflowRecord = (typeof workflowModel)["type"];
export type WorkflowRunRecord = (typeof workflowRunModel)["type"];
export const workflowDdl = workflowModel.ddl;
export const workflowRunDdl = workflowRunModel.ddl;

