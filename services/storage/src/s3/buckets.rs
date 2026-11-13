//! Bucket-level S3 operations.

use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::response::Response;

use crate::models::Bucket;
use crate::s3::errors::{S3Error, S3Result};
use crate::s3::state::{parse_range, validate_bucket_name, AppState, Principal, DEFAULT_REGION};
use crate::xml::{self, Element};

/// `GET /` — ListBuckets.
pub async fn list_buckets(
    State(state): State<AppState>,
    _principal: Principal,
) -> S3Result<Response> {
    let buckets = sqlx::query_as::<_, Bucket>(
        "SELECT name, owner, created_at, versioning FROM buckets ORDER BY name",
    )
    .fetch_all(&state.pool)
    .await?;

    let mut list = Element::new("Bucket");
    for bucket in &buckets {
        list = list.with(
            Element::new("Bucket")
                .with(Element::text("Name", &bucket.name))
                .with(Element::text(
                    "CreationDate",
                    chrono::DateTime::<chrono::Utc>::from_timestamp(bucket.created_at, 0)
                        .unwrap_or_else(chrono::Utc::now)
                        .to_rfc3339(),
                )),
        );
    }

    let root = Element::new("ListAllMyBucketsResult")
        .with(Element::text("Owner", "moonwitness"))
        .with(list);

    Ok(xml_response(StatusCode::OK, xml::document(root)))
}

/// `PUT /{bucket}` — CreateBucket.
pub async fn create_bucket(
    State(state): State<AppState>,
    _principal: Principal,
    bucket: String,
) -> S3Result<Response> {
    validate_bucket_name(&bucket)?;

    let dir = state.bucket_dir(&bucket);
    tokio::fs::create_dir_all(&dir)
        .await
        .map_err(|e| S3Error::internal(format!("cannot create bucket directory: {e}")))?;

    let existing: Option<String> = sqlx::query_scalar("SELECT name FROM buckets WHERE name = ?")
        .bind(&bucket)
        .fetch_optional(&state.pool)
        .await?;

    if existing.is_none() {
        sqlx::query(
            "INSERT INTO buckets (name, owner, created_at, versioning) VALUES (?, ?, ?, 0)",
        )
        .bind(&bucket)
        .bind("moonwitness")
        .bind(chrono::Utc::now().timestamp())
        .execute(&state.pool)
        .await?;
    }

    let mut response = Response::new(String::new().into());
    *response.status_mut() = StatusCode::OK;
    response
        .headers_mut()
        .insert("location", format!("/{bucket}").parse().unwrap());
    response.headers_mut().insert(
        "x-amz-request-id",
        uuid::Uuid::new_v4().to_string().parse().unwrap(),
    );
    Ok(response)
}

/// `HEAD /{bucket}` — HeadBucket.
pub async fn head_bucket(
    State(state): State<AppState>,
    _principal: Principal,
    bucket: String,
) -> S3Result<Response> {
    ensure_bucket(&state, &bucket).await?;
    let mut response = Response::new(String::new().into());
    *response.status_mut() = StatusCode::OK;
    response
        .headers_mut()
        .insert("x-amz-bucket-region", DEFAULT_REGION.parse().unwrap());
    Ok(response)
}

/// `DELETE /{bucket}` — DeleteBucket. Fails when the bucket still has objects.
pub async fn delete_bucket(
    State(state): State<AppState>,
    _principal: Principal,
    bucket: String,
) -> S3Result<Response> {
    ensure_bucket(&state, &bucket).await?;

    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM objects WHERE bucket = ?")
        .bind(&bucket)
        .fetch_one(&state.pool)
        .await?;
    if count > 0 {
        return Err(S3Error::bucket_not_empty(&bucket));
    }

    sqlx::query("DELETE FROM buckets WHERE name = ?")
        .bind(&bucket)
        .execute(&state.pool)
        .await?;

    let dir = state.bucket_dir(&bucket);
    if dir.exists() {
        tokio::fs::remove_dir_all(&dir)
            .await
            .map_err(|e| S3Error::internal(format!("cannot remove bucket directory: {e}")))?;
    }

    let mut response = Response::new(String::new().into());
    *response.status_mut() = StatusCode::NO_CONTENT;
    response.headers_mut().insert(
        "x-amz-request-id",
        uuid::Uuid::new_v4().to_string().parse().unwrap(),
    );
    Ok(response)
}

/// `GET /{bucket}?list-type=2` — ListObjectsV2, with v1 fallback.
pub async fn list_objects(
    State(state): State<AppState>,
    _principal: Principal,
    bucket: String,
    params: ListParams,
) -> S3Result<Response> {
    ensure_bucket(&state, &bucket).await?;

    let rows = sqlx::query_as::<_, crate::models::ObjectRow>(
        "SELECT bucket, key, etag, size, content_type, storage_class, metadata_json, created_at, \
         is_delete_marker FROM objects WHERE bucket = ? AND is_delete_marker = 0 \
         ORDER BY key",
    )
    .bind(&bucket)
    .fetch_all(&state.pool)
    .await?;

    let filtered: Vec<&crate::models::ObjectRow> = rows
        .iter()
        .filter(|row| {
            params
                .prefix
                .as_deref()
                .map(|p| row.key.starts_with(p))
                .unwrap_or(true)
        })
        .collect();

    let (entries, common_prefixes) = if let Some(delimiter) = params.delimiter.as_deref() {
        group_by_delimiter(&filtered, params.prefix.as_deref().unwrap_or(""), delimiter)
    } else {
        (filtered.clone(), Vec::new())
    };

    let max_keys = params.max_keys.unwrap_or(1000).clamp(1, 1000);
    let page: Vec<&crate::models::ObjectRow> = entries.into_iter().take(max_keys).collect();
    let truncated = page.len() == max_keys && filtered.len() > max_keys;
    let next_token = page
        .last()
        .map(|row| encode_token(&row.key))
        .filter(|_| truncated);

    let mut contents = Element::new("Contents");
    for row in &page {
        contents = contents.with(
            Element::new("Contents")
                .with(Element::text("Key", &row.key))
                .with(Element::text(
                    "LastModified",
                    chrono::DateTime::<chrono::Utc>::from_timestamp(row.created_at, 0)
                        .unwrap_or_else(chrono::Utc::now)
                        .to_rfc3339(),
                ))
                .with(Element::text("ETag", format!("\"{}\"", row.etag)))
                .with(Element::text("Size", row.size.to_string()))
                .with(Element::text(
                    "StorageClass",
                    row.storage_class
                        .clone()
                        .unwrap_or_else(|| "STANDARD".to_string()),
                )),
        );
    }

    let mut prefixes = Element::new("CommonPrefixes");
    for prefix in &common_prefixes {
        prefixes = prefixes.with(Element::text("Prefix", prefix));
    }

    let root = if params.list_type == Some(2) {
        let mut root = Element::new("ListBucketResult")
            .with(Element::text("Name", &bucket))
            .with(Element::text(
                "Prefix",
                params.prefix.clone().unwrap_or_default(),
            ))
            .with(Element::text("KeyCount", page.len().to_string()))
            .with(Element::text("MaxKeys", max_keys.to_string()))
            .with(Element::text("IsTruncated", truncated.to_string()))
            .with(contents);
        if !common_prefixes.is_empty() {
            root = root.with(prefixes);
        }
        if let Some(token) = &params.continuation_token {
            root = root.with(Element::text("ContinuationToken", token));
        }
        if let Some(next) = &next_token {
            root = root.with(Element::text("NextContinuationToken", next));
        }
        root
    } else {
        let marker = params
            .marker
            .clone()
            .or_else(|| params.continuation_token.clone())
            .unwrap_or_default();
        let mut root = Element::new("ListBucketResult")
            .with(Element::text("Name", &bucket))
            .with(Element::text(
                "Prefix",
                params.prefix.clone().unwrap_or_default(),
            ))
            .with(Element::text("Marker", &marker))
            .with(Element::text("MaxKeys", max_keys.to_string()))
            .with(Element::text("IsTruncated", truncated.to_string()))
            .with(contents);
        if !common_prefixes.is_empty() {
            root = root.with(prefixes);
        }
        if let Some(next) = &next_token {
            root = root.with(Element::text("NextMarker", next));
        }
        root
    };

    Ok(xml_response(StatusCode::OK, xml::document(root)))
}

/// Query parameters accepted by ListObjects.
#[derive(Debug, Default, serde::Deserialize)]
pub struct ListParams {
    pub prefix: Option<String>,
    pub delimiter: Option<String>,
    pub marker: Option<String>,
    #[serde(rename = "continuation-token")]
    pub continuation_token: Option<String>,
    #[serde(rename = "max-keys")]
    pub max_keys: Option<usize>,
    #[serde(rename = "list-type")]
    pub list_type: Option<u8>,
}

fn encode_token(key: &str) -> String {
    hex::encode_upper(key.as_bytes())
}

/// Splits keys into immediate contents and `CommonPrefixes` for a delimiter.
fn group_by_delimiter<'a>(
    rows: &[&'a crate::models::ObjectRow],
    prefix: &str,
    delimiter: &str,
) -> (Vec<&'a crate::models::ObjectRow>, Vec<String>) {
    let mut contents = Vec::new();
    let mut prefixes: Vec<String> = Vec::new();

    for row in rows {
        let rest = &row.key[prefix.len().min(row.key.len())..];
        match rest.find(delimiter) {
            Some(idx) => {
                let common = format!("{prefix}{}", &rest[..idx + delimiter.len()]);
                if !prefixes.contains(&common) {
                    prefixes.push(common);
                }
            }
            None => contents.push(*row),
        }
    }

    prefixes.sort();
    (contents, prefixes)
}

/// `GET /{bucket}?location` — GetBucketLocation.
pub async fn get_bucket_location(
    State(state): State<AppState>,
    _principal: Principal,
    bucket: String,
) -> S3Result<Response> {
    ensure_bucket(&state, &bucket).await?;
    let root = Element::new("LocationConstraint").with(Element::text("Location", DEFAULT_REGION));
    Ok(xml_response(StatusCode::OK, xml::document(root)))
}

/// `GET /{bucket}?uploads` — ListMultipartUploads.
pub async fn list_multipart_uploads(
    State(state): State<AppState>,
    _principal: Principal,
    bucket: String,
) -> S3Result<Response> {
    ensure_bucket(&state, &bucket).await?;

    let uploads = sqlx::query_as::<_, crate::models::MultipartUpload>(
        "SELECT upload_id, bucket, key, initiated_at, metadata_json FROM multipart_uploads \
         WHERE bucket = ? ORDER BY key",
    )
    .bind(&bucket)
    .fetch_all(&state.pool)
    .await?;

    let mut root =
        Element::new("ListMultipartUploadsResult").with(Element::text("Bucket", &bucket));
    for upload in &uploads {
        root = root.with(
            Element::new("Upload")
                .with(Element::text("Key", &upload.key))
                .with(Element::text("UploadId", &upload.upload_id))
                .with(Element::text(
                    "Initiated",
                    chrono::DateTime::<chrono::Utc>::from_timestamp(upload.initiated_at, 0)
                        .unwrap_or_else(chrono::Utc::now)
                        .to_rfc3339(),
                )),
        );
    }

    Ok(xml_response(StatusCode::OK, xml::document(root)))
}

/// Shared helper: 404 when the bucket row is missing.
pub async fn ensure_bucket(state: &AppState, bucket: &str) -> S3Result<()> {
    let exists: Option<String> = sqlx::query_scalar("SELECT name FROM buckets WHERE name = ?")
        .bind(bucket)
        .fetch_optional(&state.pool)
        .await?;
    if exists.is_none() {
        return Err(S3Error::no_such_bucket(bucket));
    }
    Ok(())
}

/// Builds an `application/xml` response with the standard request id header.
pub fn xml_response(status: StatusCode, body: String) -> Response {
    let mut response = Response::new(body.into());
    *response.status_mut() = status;
    let headers = response.headers_mut();
    headers.insert("content-type", "application/xml".parse().unwrap());
    headers.insert(
        "x-amz-request-id",
        uuid::Uuid::new_v4().to_string().parse().unwrap(),
    );
    response
}

/// Parses a `Range` header into an inclusive byte range, if satisfiable.
pub fn range_bounds(headers: &HeaderMap, total: u64) -> Option<(u64, u64)> {
    let value = headers.get("range")?.to_str().ok()?;
    parse_range(value, total)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::ObjectRow;

    fn make_row(key: &str) -> ObjectRow {
        ObjectRow {
            bucket: "test".to_string(),
            key: key.to_string(),
            etag: "etag".to_string(),
            size: 1,
            content_type: None,
            storage_class: None,
            metadata_json: None,
            created_at: 0,
            is_delete_marker: false,
        }
    }

    #[test]
    fn group_by_delimiter_basic() {
        let rows = [
            make_row("a.txt"),
            make_row("images/one.png"),
            make_row("images/two.png"),
        ];
        let refs: Vec<_> = rows.iter().collect();
        let (contents, prefixes) = group_by_delimiter(&refs, "", "/");
        assert_eq!(contents.len(), 1);
        assert_eq!(contents[0].key, "a.txt");
        assert_eq!(prefixes, vec!["images/"]);
    }
}
