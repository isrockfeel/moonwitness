//! Object-level S3 operations, including multipart uploads.

use std::collections::BTreeMap;
use std::io::SeekFrom;

use axum::body::Bytes;
use axum::extract::State;
use axum::http::{header, HeaderMap, StatusCode};
use axum::response::Response;
use serde::Deserialize;
use sha2::{Digest, Sha256};

use crate::models::{CompletePart, ObjectRow, UploadPart};
use crate::s3::buckets::{ensure_bucket, range_bounds, xml_response};
use crate::s3::errors::{S3Error, S3Result};
use crate::s3::state::{safe_component, AppState, Principal};
use crate::xml::{self, Element};

/// `PUT /{bucket}/{key}` — PutObject, or CopyObject when `x-amz-copy-source` is set.
pub async fn put_object(
    State(state): State<AppState>,
    _principal: Principal,
    bucket: String,
    key: String,
    headers: HeaderMap,
    body: Bytes,
) -> S3Result<Response> {
    ensure_bucket(&state, &bucket).await?;

    if let Some(source) = headers
        .get("x-amz-copy-source")
        .and_then(|v| v.to_str().ok())
    {
        return copy_object(&state, &bucket, &key, source).await;
    }

    if body.len() as u64 > state.config.max_object_size {
        return Err(S3Error::entity_too_large(state.config.max_object_size));
    }

    let etag = format!("{:x}", Sha256::digest(&body));
    let path = state.object_path(&bucket, &key)?;
    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| S3Error::internal(format!("cannot create object directory: {e}")))?;
    }
    tokio::fs::write(&path, &body)
        .await
        .map_err(|e| S3Error::internal(format!("cannot write object: {e}")))?;

    let content_type = headers
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());
    let metadata = collect_metadata(&headers);

    sqlx::query(
        "INSERT INTO objects (bucket, key, etag, size, content_type, storage_class, metadata_json, \
         created_at, is_delete_marker) VALUES (?, ?, ?, ?, ?, 'STANDARD', ?, ?, 0) \
         ON CONFLICT(bucket, key) DO UPDATE SET etag = excluded.etag, size = excluded.size, \
         content_type = excluded.content_type, metadata_json = excluded.metadata_json, \
         created_at = excluded.created_at, is_delete_marker = 0",
    )
    .bind(&bucket)
    .bind(&key)
    .bind(&etag)
    .bind(body.len() as i64)
    .bind(&content_type)
    .bind(metadata)
    .bind(chrono::Utc::now().timestamp())
    .execute(&state.pool)
    .await?;

    let mut response = Response::new(String::new().into());
    *response.status_mut() = StatusCode::OK;
    let headers = response.headers_mut();
    headers.insert("etag", format!("\"{etag}\"").parse().unwrap());
    headers.insert(
        "x-amz-request-id",
        uuid::Uuid::new_v4().to_string().parse().unwrap(),
    );
    Ok(response)
}

/// `GET /{bucket}/{key}` — GetObject, with `Range` support.
pub async fn get_object(
    State(state): State<AppState>,
    _principal: Principal,
    bucket: String,
    key: String,
    headers: HeaderMap,
) -> S3Result<Response> {
    ensure_bucket(&state, &bucket).await?;
    let row = fetch_object(&state, &bucket, &key).await?;

    let path = state.object_path(&bucket, &key)?;
    let total = tokio::fs::metadata(&path)
        .await
        .map_err(|e| S3Error::internal(format!("cannot stat object: {e}")))?
        .len();

    let (start, end) = match range_bounds(&headers, total) {
        Some((start, end)) => (start, end),
        None => (0, total.saturating_sub(1)),
    };
    let length = end.saturating_sub(start) + 1;

    let mut file = tokio::fs::File::open(&path)
        .await
        .map_err(|e| S3Error::internal(format!("cannot open object: {e}")))?;
    use tokio::io::{AsyncReadExt, AsyncSeekExt};
    file.seek(SeekFrom::Start(start))
        .await
        .map_err(|e| S3Error::internal(format!("cannot seek object: {e}")))?;
    let mut buf = vec![0u8; length as usize];
    file.read_exact(&mut buf)
        .await
        .map_err(|e| S3Error::internal(format!("cannot read object: {e}")))?;

    let status = if headers.contains_key(header::RANGE) {
        StatusCode::PARTIAL_CONTENT
    } else {
        StatusCode::OK
    };

    let mut response = Response::new(Bytes::from(buf).into());
    *response.status_mut() = status;
    let out_headers = response.headers_mut();
    out_headers.insert(header::CONTENT_LENGTH, length.to_string().parse().unwrap());
    out_headers.insert(
        header::CONTENT_RANGE,
        format!("bytes {start}-{end}/{total}").parse().unwrap(),
    );
    out_headers.insert(header::ETAG, format!("\"{}\"", row.etag).parse().unwrap());
    out_headers.insert(
        header::LAST_MODIFIED,
        chrono::DateTime::<chrono::Utc>::from_timestamp(row.created_at, 0)
            .unwrap_or_else(chrono::Utc::now)
            .to_rfc2822()
            .parse()
            .unwrap(),
    );
    out_headers.insert(header::ACCEPT_RANGES, "bytes".parse().unwrap());
    if let Some(content_type) = &row.content_type {
        out_headers.insert(
            header::CONTENT_TYPE,
            content_type
                .parse()
                .unwrap_or_else(|_| "application/octet-stream".parse().unwrap()),
        );
    }
    out_headers.insert(
        "x-amz-request-id",
        uuid::Uuid::new_v4().to_string().parse().unwrap(),
    );
    Ok(response)
}

/// `HEAD /{bucket}/{key}` — HeadObject.
pub async fn head_object(
    State(state): State<AppState>,
    _principal: Principal,
    bucket: String,
    key: String,
) -> S3Result<Response> {
    ensure_bucket(&state, &bucket).await?;
    let row = fetch_object(&state, &bucket, &key).await?;

    let mut response = Response::new(String::new().into());
    *response.status_mut() = StatusCode::OK;
    let headers = response.headers_mut();
    headers.insert(
        header::CONTENT_LENGTH,
        row.size.to_string().parse().unwrap(),
    );
    headers.insert(header::ETAG, format!("\"{}\"", row.etag).parse().unwrap());
    headers.insert(header::ACCEPT_RANGES, "bytes".parse().unwrap());
    if let Some(content_type) = &row.content_type {
        headers.insert(
            header::CONTENT_TYPE,
            content_type
                .parse()
                .unwrap_or_else(|_| "application/octet-stream".parse().unwrap()),
        );
    }
    headers.insert(
        "x-amz-request-id",
        uuid::Uuid::new_v4().to_string().parse().unwrap(),
    );
    Ok(response)
}

/// `DELETE /{bucket}/{key}` — DeleteObject.
pub async fn delete_object(
    State(state): State<AppState>,
    _principal: Principal,
    bucket: String,
    key: String,
) -> S3Result<Response> {
    ensure_bucket(&state, &bucket).await?;

    let path = state.object_path(&bucket, &key)?;
    if path.exists() {
        tokio::fs::remove_file(&path)
            .await
            .map_err(|e| S3Error::internal(format!("cannot delete object: {e}")))?;
    }
    sqlx::query("DELETE FROM objects WHERE bucket = ? AND key = ?")
        .bind(&bucket)
        .bind(&key)
        .execute(&state.pool)
        .await?;

    let mut response = Response::new(String::new().into());
    *response.status_mut() = StatusCode::NO_CONTENT;
    response.headers_mut().insert(
        "x-amz-request-id",
        uuid::Uuid::new_v4().to_string().parse().unwrap(),
    );
    Ok(response)
}

/// `POST /{bucket}/{key}?uploads` — CreateMultipartUpload.
pub async fn create_multipart_upload(
    State(state): State<AppState>,
    _principal: Principal,
    bucket: String,
    key: String,
    headers: HeaderMap,
) -> S3Result<Response> {
    ensure_bucket(&state, &bucket).await?;
    state.object_path(&bucket, &key)?;

    let upload_id = uuid::Uuid::new_v4().to_string();
    let metadata = collect_metadata(&headers);

    sqlx::query(
        "INSERT INTO multipart_uploads (upload_id, bucket, key, initiated_at, metadata_json) \
         VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&upload_id)
    .bind(&bucket)
    .bind(&key)
    .bind(chrono::Utc::now().timestamp())
    .bind(metadata)
    .execute(&state.pool)
    .await?;

    let dir = state.multipart_dir(&upload_id)?;
    tokio::fs::create_dir_all(&dir)
        .await
        .map_err(|e| S3Error::internal(format!("cannot create multipart directory: {e}")))?;

    let root = Element::new("InitiateMultipartUploadResult")
        .with(Element::text("Bucket", &bucket))
        .with(Element::text("Key", &key))
        .with(Element::text("UploadId", &upload_id));
    Ok(xml_response(StatusCode::OK, xml::document(root)))
}

/// `PUT /{bucket}/{key}?partNumber=N&uploadId=…` — UploadPart.
pub async fn upload_part(
    State(state): State<AppState>,
    _principal: Principal,
    bucket: String,
    key: String,
    params: PartParams,
    body: Bytes,
) -> S3Result<Response> {
    ensure_bucket(&state, &bucket).await?;
    let upload = fetch_upload(&state, &params.upload_id).await?;
    if upload.bucket != bucket || upload.key != key {
        return Err(S3Error::invalid_request(
            "upload id does not match bucket/key",
        ));
    }
    if !(1..=10_000).contains(&params.part_number) {
        return Err(S3Error::invalid_request(
            "part number must be between 1 and 10000",
        ));
    }
    if body.len() as u64 > state.config.max_object_size {
        return Err(S3Error::entity_too_large(state.config.max_object_size));
    }

    let etag = format!("{:x}", Sha256::digest(&body));
    let path = state.part_path(&params.upload_id, params.part_number)?;
    tokio::fs::write(&path, &body)
        .await
        .map_err(|e| S3Error::internal(format!("cannot write part: {e}")))?;

    sqlx::query(
        "INSERT INTO upload_parts (upload_id, part_number, etag, size) VALUES (?, ?, ?, ?) \
         ON CONFLICT(upload_id, part_number) DO UPDATE SET etag = excluded.etag, size = excluded.size",
    )
    .bind(&params.upload_id)
    .bind(params.part_number)
    .bind(&etag)
    .bind(body.len() as i64)
    .execute(&state.pool)
    .await?;

    let mut response = Response::new(String::new().into());
    *response.status_mut() = StatusCode::OK;
    let headers = response.headers_mut();
    headers.insert("etag", format!("\"{etag}\"").parse().unwrap());
    headers.insert(
        "x-amz-request-id",
        uuid::Uuid::new_v4().to_string().parse().unwrap(),
    );
    Ok(response)
}

/// `POST /{bucket}/{key}?uploadId=…` — CompleteMultipartUpload.
pub async fn complete_multipart_upload(
    State(state): State<AppState>,
    _principal: Principal,
    bucket: String,
    key: String,
    params: PartParams,
    body: Bytes,
) -> S3Result<Response> {
    ensure_bucket(&state, &bucket).await?;
    let upload = fetch_upload(&state, &params.upload_id).await?;
    if upload.bucket != bucket || upload.key != key {
        return Err(S3Error::invalid_request(
            "upload id does not match bucket/key",
        ));
    }

    let requested = parse_complete_body(&body)?;
    let parts = sqlx::query_as::<_, UploadPart>(
        "SELECT upload_id, part_number, etag, size FROM upload_parts \
         WHERE upload_id = ? ORDER BY part_number",
    )
    .bind(&params.upload_id)
    .fetch_all(&state.pool)
    .await?;

    if parts.is_empty() {
        return Err(S3Error::invalid_request("no parts were uploaded"));
    }

    // Every requested part must exist with a matching ETag.
    for part in &requested {
        let stored = parts.iter().find(|p| p.part_number == part.part_number);
        match stored {
            Some(stored)
                if stored
                    .etag
                    .eq_ignore_ascii_case(part.etag.trim_matches('"')) => {}
            Some(_) => {
                return Err(S3Error::new(
                    StatusCode::BAD_REQUEST,
                    "InvalidPart",
                    format!("part {} has an unexpected ETag", part.part_number),
                ))
            }
            None => {
                return Err(S3Error::new(
                    StatusCode::BAD_REQUEST,
                    "InvalidPart",
                    format!("part {} was not uploaded", part.part_number),
                ))
            }
        }
    }

    let object_path = state.object_path(&bucket, &key)?;
    if let Some(parent) = object_path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| S3Error::internal(format!("cannot create object directory: {e}")))?;
    }

    let mut output = tokio::fs::File::create(&object_path)
        .await
        .map_err(|e| S3Error::internal(format!("cannot create object: {e}")))?;
    use tokio::io::AsyncWriteExt;

    let mut total: i64 = 0;
    for part in &parts {
        let path = state.part_path(&params.upload_id, part.part_number)?;
        let mut file = tokio::fs::File::open(&path)
            .await
            .map_err(|e| S3Error::internal(format!("cannot open part: {e}")))?;
        use tokio::io::AsyncReadExt;
        let mut buf = Vec::new();
        file.read_to_end(&mut buf)
            .await
            .map_err(|e| S3Error::internal(format!("cannot read part: {e}")))?;
        output
            .write_all(&buf)
            .await
            .map_err(|e| S3Error::internal(format!("cannot assemble object: {e}")))?;
        total += part.size;
    }
    output
        .flush()
        .await
        .map_err(|e| S3Error::internal(format!("cannot flush object: {e}")))?;

    let etag = format!("{:x}-{}", Sha256::digest(total.to_string()), parts.len());
    sqlx::query(
        "INSERT INTO objects (bucket, key, etag, size, content_type, storage_class, metadata_json, \
         created_at, is_delete_marker) VALUES (?, ?, ?, ?, ?, 'STANDARD', ?, ?, 0) \
         ON CONFLICT(bucket, key) DO UPDATE SET etag = excluded.etag, size = excluded.size, \
         created_at = excluded.created_at, is_delete_marker = 0",
    )
    .bind(&bucket)
    .bind(&key)
    .bind(&etag)
    .bind(total)
    .bind(
        upload
            .metadata_json
            .as_deref()
            .and_then(|m| serde_json::from_str::<serde_json::Value>(m).ok())
            .and_then(|v| v.get("content-type").and_then(|c| c.as_str().map(String::from))),
    )
    .bind(upload.metadata_json.clone())
    .bind(chrono::Utc::now().timestamp())
    .execute(&state.pool)
    .await?;

    cleanup_multipart(&state, &params.upload_id).await?;

    let root = Element::new("CompleteMultipartUploadResult")
        .with(Element::text("Location", format!("/{bucket}/{key}")))
        .with(Element::text("Bucket", &bucket))
        .with(Element::text("Key", &key))
        .with(Element::text("ETag", format!("\"{etag}\"")));
    Ok(xml_response(StatusCode::OK, xml::document(root)))
}

/// `DELETE /{bucket}/{key}?uploadId=…` — AbortMultipartUpload.
pub async fn abort_multipart_upload(
    State(state): State<AppState>,
    _principal: Principal,
    bucket: String,
    key: String,
    params: PartParams,
) -> S3Result<Response> {
    ensure_bucket(&state, &bucket).await?;
    let upload = fetch_upload(&state, &params.upload_id).await?;
    if upload.bucket != bucket || upload.key != key {
        return Err(S3Error::invalid_request(
            "upload id does not match bucket/key",
        ));
    }
    cleanup_multipart(&state, &params.upload_id).await?;

    let mut response = Response::new(String::new().into());
    *response.status_mut() = StatusCode::NO_CONTENT;
    response.headers_mut().insert(
        "x-amz-request-id",
        uuid::Uuid::new_v4().to_string().parse().unwrap(),
    );
    Ok(response)
}

/// `GET /{bucket}/{key}?uploadId=…` — ListParts.
pub async fn list_parts(
    State(state): State<AppState>,
    _principal: Principal,
    bucket: String,
    key: String,
    params: PartParams,
) -> S3Result<Response> {
    ensure_bucket(&state, &bucket).await?;
    let upload = fetch_upload(&state, &params.upload_id).await?;
    if upload.bucket != bucket || upload.key != key {
        return Err(S3Error::invalid_request(
            "upload id does not match bucket/key",
        ));
    }

    let parts = sqlx::query_as::<_, UploadPart>(
        "SELECT upload_id, part_number, etag, size FROM upload_parts \
         WHERE upload_id = ? ORDER BY part_number",
    )
    .bind(&params.upload_id)
    .fetch_all(&state.pool)
    .await?;

    let mut root = Element::new("ListPartsResult")
        .with(Element::text("Bucket", &bucket))
        .with(Element::text("Key", &key))
        .with(Element::text("UploadId", &params.upload_id));
    for part in &parts {
        root = root.with(
            Element::new("Part")
                .with(Element::text("PartNumber", part.part_number.to_string()))
                .with(Element::text("ETag", format!("\"{}\"", part.etag)))
                .with(Element::text("Size", part.size.to_string())),
        );
    }
    Ok(xml_response(StatusCode::OK, xml::document(root)))
}

#[derive(Debug, Deserialize)]
pub struct PartParams {
    #[serde(rename = "uploadId")]
    pub upload_id: String,
    #[serde(rename = "partNumber")]
    pub part_number: i64,
}

async fn copy_object(
    state: &AppState,
    bucket: &str,
    key: &str,
    source: &str,
) -> S3Result<Response> {
    let source = source.split('?').next().unwrap_or(source);
    let source = crate::s3::state::percent_decode(source);
    let source = source.trim_start_matches('/');
    let (source_bucket, source_key) = source
        .split_once('/')
        .ok_or_else(|| S3Error::invalid_request("invalid x-amz-copy-source"))?;

    let row = fetch_object(state, source_bucket, source_key).await?;
    let src_path = state.object_path(source_bucket, source_key)?;
    let dst_path = state.object_path(bucket, key)?;
    if let Some(parent) = dst_path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| S3Error::internal(format!("cannot create object directory: {e}")))?;
    }
    tokio::fs::copy(&src_path, &dst_path)
        .await
        .map_err(|e| S3Error::internal(format!("cannot copy object: {e}")))?;

    sqlx::query(
        "INSERT INTO objects (bucket, key, etag, size, content_type, storage_class, metadata_json, \
         created_at, is_delete_marker) VALUES (?, ?, ?, ?, ?, 'STANDARD', ?, ?, 0) \
         ON CONFLICT(bucket, key) DO UPDATE SET etag = excluded.etag, size = excluded.size, \
         content_type = excluded.content_type, created_at = excluded.created_at, \
         is_delete_marker = 0",
    )
    .bind(bucket)
    .bind(key)
    .bind(&row.etag)
    .bind(row.size)
    .bind(&row.content_type)
    .bind(&row.metadata_json)
    .bind(chrono::Utc::now().timestamp())
    .execute(&state.pool)
    .await?;

    let root = Element::new("CopyObjectResult")
        .with(Element::text("ETag", format!("\"{}\"", row.etag)))
        .with(Element::text(
            "LastModified",
            chrono::Utc::now().to_rfc3339(),
        ));
    Ok(xml_response(StatusCode::OK, xml::document(root)))
}

async fn fetch_object(state: &AppState, bucket: &str, key: &str) -> S3Result<ObjectRow> {
    let row = sqlx::query_as::<_, ObjectRow>(
        "SELECT bucket, key, etag, size, content_type, storage_class, metadata_json, created_at, \
         is_delete_marker FROM objects WHERE bucket = ? AND key = ?",
    )
    .bind(bucket)
    .bind(key)
    .fetch_optional(&state.pool)
    .await?;

    match row {
        Some(row) if !row.is_delete_marker => Ok(row),
        _ => Err(S3Error::no_such_key(key)),
    }
}

async fn fetch_upload(
    state: &AppState,
    upload_id: &str,
) -> S3Result<crate::models::MultipartUpload> {
    let id = safe_component(upload_id, "upload id")?;
    let upload = sqlx::query_as::<_, crate::models::MultipartUpload>(
        "SELECT upload_id, bucket, key, initiated_at, metadata_json FROM multipart_uploads \
         WHERE upload_id = ?",
    )
    .bind(&id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| {
        S3Error::new(
            StatusCode::NOT_FOUND,
            "NoSuchUpload",
            "the upload was not found",
        )
    })?;
    Ok(upload)
}

async fn cleanup_multipart(state: &AppState, upload_id: &str) -> S3Result<()> {
    sqlx::query("DELETE FROM upload_parts WHERE upload_id = ?")
        .bind(upload_id)
        .execute(&state.pool)
        .await?;
    sqlx::query("DELETE FROM multipart_uploads WHERE upload_id = ?")
        .bind(upload_id)
        .execute(&state.pool)
        .await?;
    if let Ok(dir) = state.multipart_dir(upload_id) {
        if dir.exists() {
            let _ = tokio::fs::remove_dir_all(&dir).await;
        }
    }
    Ok(())
}

fn collect_metadata(headers: &HeaderMap) -> Option<String> {
    let mut map = BTreeMap::new();
    for (name, value) in headers.iter() {
        let name = name.as_str();
        if let Some(meta) = name
            .strip_prefix("x-amz-meta-")
            .or_else(|| name.strip_prefix("X-Amz-Meta-"))
        {
            if let Ok(value) = value.to_str() {
                map.insert(meta.to_string(), value.to_string());
            }
        }
    }
    if map.is_empty() {
        None
    } else {
        serde_json::to_string(&map).ok()
    }
}

fn parse_complete_body(body: &Bytes) -> S3Result<Vec<CompletePart>> {
    let text = std::str::from_utf8(body)
        .map_err(|_| S3Error::invalid_request("request body must be UTF-8 XML"))?;
    parse_complete_xml(text)
}

/// Parses the `<CompleteMultipartUpload><Part>…</Part></CompleteMultipartUpload>` body
/// without adding an XML dependency: the payload shape is fixed and small.
fn parse_complete_xml(text: &str) -> S3Result<Vec<CompletePart>> {
    let mut parts = Vec::new();
    let mut rest = text;
    while let Some(start) = rest.find("<Part>") {
        let after = &rest[start + "<Part>".len()..];
        let end = after
            .find("</Part>")
            .ok_or_else(|| S3Error::invalid_request("malformed <Part> element"))?;
        let chunk = &after[..end];
        let part_number = extract_tag(chunk, "PartNumber")
            .ok_or_else(|| S3Error::invalid_request("missing <PartNumber>"))?
            .parse::<i64>()
            .map_err(|_| S3Error::invalid_request("invalid <PartNumber>"))?;
        let etag =
            extract_tag(chunk, "ETag").ok_or_else(|| S3Error::invalid_request("missing <ETag>"))?;
        parts.push(CompletePart { part_number, etag });
        rest = &after[end + "</Part>".len()..];
    }

    if parts.is_empty() {
        return Err(S3Error::invalid_request(
            "request body must contain at least one <Part>",
        ));
    }
    Ok(parts)
}

fn extract_tag(input: &str, tag: &str) -> Option<String> {
    let open = format!("<{tag}>");
    let close = format!("</{tag}>");
    let start = input.find(&open)? + open.len();
    let end = input[start..].find(&close)? + start;
    Some(input[start..end].trim().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_complete_multipart_body() {
        let body = Bytes::from(
            "<CompleteMultipartUpload>\
             <Part><PartNumber>1</PartNumber><ETag>\"abc\"</ETag></Part>\
             <Part><PartNumber>2</PartNumber><ETag>\"def\"</ETag></Part>\
             </CompleteMultipartUpload>",
        );
        let parts = parse_complete_body(&body).unwrap();
        assert_eq!(parts.len(), 2);
        assert_eq!(parts[0].part_number, 1);
        assert_eq!(parts[1].etag, "\"def\"");
    }

    #[test]
    fn rejects_body_without_parts() {
        let body = Bytes::from("<CompleteMultipartUpload></CompleteMultipartUpload>");
        assert!(parse_complete_body(&body).is_err());
    }
}
