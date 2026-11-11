import { timelineEventModel, timelineEraModel } from "./timeline-model";
import { userModel, sessionModel } from "./user-model";
import { projectModel } from "./project-model";
import { workflowModel, workflowRunModel } from "./workflow-model";
import { moduleModel } from "./module-model";
import { collectionModel } from "./collection-model";
import { feedItemModel } from "./feed-model";
import { alertModel } from "./alert-model";
import { witnessModel } from "./witness-model";

export const auditLogDdl = `
CREATE TABLE IF NOT EXISTS _orm_audit_log (
  id TEXT PRIMARY KEY,
  model TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  changed_by TEXT,
  changed_at TEXT NOT NULL,
  diff TEXT NOT NULL,
  entity_version INTEGER NOT NULL,
  source TEXT NOT NULL,
  request_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_model_entity ON _orm_audit_log (model, entity_id, changed_at);
`.trim();

export const schemaDdl = [
  auditLogDdl,
  timelineEventModel.ddl,
  timelineEraModel.ddl,
  userModel.ddl,
  sessionModel.ddl,
  projectModel.ddl,
  workflowModel.ddl,
  workflowRunModel.ddl,
  moduleModel.ddl,
  collectionModel.ddl,
  feedItemModel.ddl,
  alertModel.ddl,
  witnessModel.ddl,
].join(";\n");

export const allModelsDdl = schemaDdl;

