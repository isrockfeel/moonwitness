CREATE TABLE IF NOT EXISTS buckets (
    name TEXT PRIMARY KEY,
    owner TEXT,
    created_at INTEGER NOT NULL,
    versioning INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS objects (
    bucket TEXT NOT NULL,
    key TEXT NOT NULL,
    etag TEXT NOT NULL,
    size INTEGER NOT NULL,
    content_type TEXT,
    storage_class TEXT,
    metadata_json TEXT,
    created_at INTEGER NOT NULL,
    is_delete_marker INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (bucket, key)
);

CREATE TABLE IF NOT EXISTS multipart_uploads (
    upload_id TEXT PRIMARY KEY,
    bucket TEXT NOT NULL,
    key TEXT NOT NULL,
    initiated_at INTEGER NOT NULL,
    metadata_json TEXT
);

CREATE TABLE IF NOT EXISTS upload_parts (
    upload_id TEXT NOT NULL,
    part_number INTEGER NOT NULL,
    etag TEXT NOT NULL,
    size INTEGER NOT NULL,
    PRIMARY KEY (upload_id, part_number)
);

CREATE INDEX IF NOT EXISTS idx_objects_bucket_key ON objects(bucket, key);
CREATE INDEX IF NOT EXISTS idx_upload_parts_upload ON upload_parts(upload_id, part_number);
CREATE INDEX IF NOT EXISTS idx_multipart_bucket_key ON multipart_uploads(bucket, key);