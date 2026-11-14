//! S3 protocol layer: routing, authentication, and handlers.

pub mod buckets;
pub mod errors;
pub mod objects;
pub mod state;

use axum::body::Bytes;
use axum::extract::{DefaultBodyLimit, RawQuery, State};
use axum::http::{HeaderMap, Method, StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use axum::routing::{any, get};
use axum::Router;

use crate::s3::buckets::{
    create_bucket, delete_bucket, get_bucket_location, head_bucket, list_buckets,
    list_multipart_uploads, list_objects, ListParams,
};
use crate::s3::errors::S3Error;
use crate::s3::objects::{
    abort_multipart_upload, complete_multipart_upload, create_multipart_upload, delete_object,
    get_object, head_object, list_parts, put_object, upload_part, PartParams,
};
use crate::s3::state::{authenticate, AppState, Principal};

/// Builds the S3 router. Every route is wrapped in a single fallback so that
/// authentication and canonical-URI computation happen in one place.
pub fn router(state: AppState) -> Router {
    let max_size = state.config.max_object_size as usize;

    Router::new()
        .route("/health", get(health))
        .fallback(any(s3_fallback))
        .layer(DefaultBodyLimit::max(max_size))
        .with_state(state)
}

async fn health() -> Response {
    let mut response = (
        StatusCode::OK,
        serde_json::json!({ "status": "ok", "service": "storage" }).to_string(),
    )
        .into_response();
    response
        .headers_mut()
        .insert("content-type", "application/json".parse().unwrap());
    response
}

/// Single entry point for every S3 request.
///
/// The path is split into bucket and key here so that the canonical URI used for
/// SigV4 matches what the client signed, regardless of percent-encoding.
async fn s3_fallback(
    State(state): State<AppState>,
    method: Method,
    uri: Uri,
    RawQuery(raw_query): RawQuery,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let request_id = uuid::Uuid::new_v4().to_string();
    let raw_query = raw_query.unwrap_or_default();

    let path = uri.path();
    let mut segments = path
        .split('/')
        .filter(|s| !s.is_empty())
        .map(percent_decode_segment);

    let bucket = segments.next();
    let key: Option<String> = {
        let rest: Vec<String> = segments.collect();
        if rest.is_empty() {
            None
        } else {
            Some(rest.join("/"))
        }
    };

    let canonical_uri = match (&bucket, &key) {
        (Some(bucket), Some(key)) => crate::sigv4::canonical_object_uri(bucket, key),
        (Some(bucket), None) => crate::sigv4::canonical_bucket_uri(bucket),
        _ => "/".to_string(),
    };

    let principal = match authenticate(
        &state,
        method.as_str(),
        &raw_query,
        &canonical_uri,
        &headers,
    ) {
        Ok(principal) => principal,
        Err(err) => return with_request_id(err.into_response(), &request_id),
    };

    let result = dispatch(
        &state,
        &method,
        &raw_query,
        bucket.as_deref(),
        key.as_deref(),
        principal,
        headers,
        body,
    )
    .await;

    match result {
        Ok(response) => with_request_id(response, &request_id),
        Err(err) => with_request_id(err.into_response(), &request_id),
    }
}

#[allow(clippy::too_many_arguments)]
async fn dispatch(
    state: &AppState,
    method: &Method,
    raw_query: &str,
    bucket: Option<&str>,
    key: Option<&str>,
    principal: Principal,
    headers: HeaderMap,
    body: Bytes,
) -> Result<Response, S3Error> {
    let query = crate::s3::state::parse_query(raw_query);
    let has = |name: &str| query.iter().any(|(k, _)| k == name);

    match (method, bucket, key) {
        // Service-level: ListBuckets.
        (&Method::GET, None, None) => {
            if has("location") {
                return Err(S3Error::invalid_request("bucket is required"));
            }
            list_buckets(State(state.clone()), principal).await
        }

        // Bucket-level operations.
        (&Method::PUT, Some(bucket), None) => {
            create_bucket(State(state.clone()), principal, bucket.to_string()).await
        }
        (&Method::HEAD, Some(bucket), None) => {
            head_bucket(State(state.clone()), principal, bucket.to_string()).await
        }
        (&Method::DELETE, Some(bucket), None) => {
            delete_bucket(State(state.clone()), principal, bucket.to_string()).await
        }
        (&Method::GET, Some(bucket), None) => {
            if has("location") {
                return get_bucket_location(State(state.clone()), principal, bucket.to_string())
                    .await;
            }
            if has("uploads") {
                return list_multipart_uploads(State(state.clone()), principal, bucket.to_string())
                    .await;
            }
            let params: ListParams = parse_list_params(raw_query);
            list_objects(State(state.clone()), principal, bucket.to_string(), params).await
        }

        // Object-level operations.
        (&Method::PUT, Some(bucket), Some(key)) => {
            if has("partNumber") && has("uploadId") {
                let params = parse_part_params(raw_query)?;
                return upload_part(
                    State(state.clone()),
                    principal,
                    bucket.to_string(),
                    key.to_string(),
                    params,
                    body,
                )
                .await;
            }
            put_object(
                State(state.clone()),
                principal,
                bucket.to_string(),
                key.to_string(),
                headers,
                body,
            )
            .await
        }
        (&Method::GET, Some(bucket), Some(key)) => {
            if has("uploadId") {
                let params = parse_part_params(raw_query)?;
                return list_parts(
                    State(state.clone()),
                    principal,
                    bucket.to_string(),
                    key.to_string(),
                    params,
                )
                .await;
            }
            get_object(
                State(state.clone()),
                principal,
                bucket.to_string(),
                key.to_string(),
                headers,
            )
            .await
        }
        (&Method::HEAD, Some(bucket), Some(key)) => {
            head_object(
                State(state.clone()),
                principal,
                bucket.to_string(),
                key.to_string(),
            )
            .await
        }
        (&Method::DELETE, Some(bucket), Some(key)) => {
            if has("uploadId") {
                let params = parse_part_params(raw_query)?;
                return abort_multipart_upload(
                    State(state.clone()),
                    principal,
                    bucket.to_string(),
                    key.to_string(),
                    params,
                )
                .await;
            }
            delete_object(
                State(state.clone()),
                principal,
                bucket.to_string(),
                key.to_string(),
            )
            .await
        }
        (&Method::POST, Some(bucket), Some(key)) => {
            if has("uploads") {
                return create_multipart_upload(
                    State(state.clone()),
                    principal,
                    bucket.to_string(),
                    key.to_string(),
                    headers,
                )
                .await;
            }
            if has("uploadId") {
                let params = parse_part_params(raw_query)?;
                return complete_multipart_upload(
                    State(state.clone()),
                    principal,
                    bucket.to_string(),
                    key.to_string(),
                    params,
                    body,
                )
                .await;
            }
            Err(S3Error::not_implemented("POST object"))
        }

        _ => Err(S3Error::not_implemented(&format!(
            "{} {path}",
            method.as_str(),
            path = bucket
                .map(|b| key
                    .map(|k| format!("/{b}/{k}"))
                    .unwrap_or_else(|| format!("/{b}")))
                .unwrap_or_else(|| "/".to_string())
        ))),
    }
}

fn parse_list_params(raw_query: &str) -> ListParams {
    let query = crate::s3::state::parse_query(raw_query);
    let get = |name: &str| {
        query
            .iter()
            .find(|(k, _)| k == name)
            .map(|(_, v)| v.clone())
    };
    ListParams {
        prefix: get("prefix"),
        delimiter: get("delimiter"),
        marker: get("marker"),
        continuation_token: get("continuation-token"),
        max_keys: get("max-keys").and_then(|v| v.parse().ok()),
        list_type: get("list-type").and_then(|v| v.parse().ok()),
    }
}

fn parse_part_params(raw_query: &str) -> Result<PartParams, S3Error> {
    let query = crate::s3::state::parse_query(raw_query);
    let upload_id = query
        .iter()
        .find(|(k, _)| k == "uploadId")
        .map(|(_, v)| v.clone())
        .ok_or_else(|| S3Error::invalid_request("missing uploadId"))?;
    let part_number = query
        .iter()
        .find(|(k, _)| k == "partNumber")
        .and_then(|(_, v)| v.parse::<i64>().ok());

    Ok(PartParams {
        upload_id,
        part_number: part_number.unwrap_or(0),
    })
}

fn percent_decode_segment(segment: &str) -> String {
    crate::s3::state::percent_decode(segment)
}

fn with_request_id(mut response: Response, request_id: &str) -> Response {
    if let Ok(value) = request_id.parse() {
        response.headers_mut().insert("x-amz-request-id", value);
    }
    response
}
