use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct Bucket {
    pub name: String,
    pub owner: Option<String>,
    pub created_at: i64,
    pub versioning: bool,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct ObjectRow {
    pub bucket: String,
    pub key: String,
    pub etag: String,
    pub size: i64,
    pub content_type: Option<String>,
    pub storage_class: Option<String>,
    pub metadata_json: Option<String>,
    pub created_at: i64,
    pub is_delete_marker: bool,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct MultipartUpload {
    pub upload_id: String,
    pub bucket: String,
    pub key: String,
    pub initiated_at: i64,
    pub metadata_json: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct UploadPart {
    pub upload_id: String,
    pub part_number: i64,
    pub etag: String,
    pub size: i64,
}

#[derive(Debug, Deserialize)]
pub struct CompletePart {
    #[serde(rename = "PartNumber")]
    pub part_number: i64,
    #[serde(rename = "ETag")]
    pub etag: String,
}
