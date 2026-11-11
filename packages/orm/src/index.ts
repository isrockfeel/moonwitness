export { defineModel, uuidv7, BaseRepository } from "./define-model.js";
export type {
  DefineModelOptions,
  DefineModelReturn,
  AuditAction,
  AuditEntry,
  ModelRecord,
} from "./define-model.js";
export type { BaseMetadata, RecordStatus, RecordSource } from "./base-metadata.js";
export { createActorContext, SYSTEM_ACTOR } from "./actor-context.js";
export type { ActorContext, ActorSource } from "./actor-context.js";
export { ConflictError } from "./errors.js";
export { initDb, closeDb, getDb } from "./driver.js";
export { LibSqlDriver } from "./drivers/sqlite.driver.js";
export type { LibSqlExecutor } from "./drivers/sqlite.driver.js";
export { applyMigrations, listAppliedMigrations } from "./migrations.js";
export type { Migration } from "./migrations.js";
export { AddonRegistryImpl } from "./addon-registry.js";
export { SeedMerger, SeedLoader } from "./seed-framework.js";
export type {
  AddonManifest,
  AddonProvides,
  AddonDefinition,
  AddonContract,
  AddonModelContract,
  AddonIndexContract,
  AddonRouteContract,
  AddonUsecaseContract,
  AddonUsecaseMethodContract,
  AddonRegistry,
  SeedEntry,
  SeedMergeResult,
  SeedMergeError,
  SeedStatus,
  AddonStatus,
  AddonLoadResult,
} from "./addon-types.js";