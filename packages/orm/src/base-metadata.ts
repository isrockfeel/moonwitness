export type RecordStatus = "active" | "archived" | "deleted";
export type RecordSource = "seed" | "api" | "import" | "migration";

export interface BaseMetadata {
  id: string; // UUID v7
  create_uid: string | null; // null = system/seed
  create_date: Date;
  write_uid: string | null;
  write_date: Date;
  status: RecordStatus;
  deleted_uid: string | null;
  deleted_date: Date | null;
  version: number; // optimistic locking
  source: RecordSource;
  source_ref: string | null;
}
