//! S3-compatible error codes and XML error responses.

use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};

use crate::sigv4::SigV4Error;
use crate::xml::{self, Element};

/// An S3 error: a protocol-level code plus the HTTP status clients expect.
#[derive(Debug)]
pub struct S3Error {
    pub status: StatusCode,
    pub code: &'static str,
    pub message: String,
}

impl S3Error {
    pub fn new(status: StatusCode, code: &'static str, message: impl Into<String>) -> Self {
        S3Error {
            status,
            code,
            message: message.into(),
        }
    }

    pub fn no_such_bucket(bucket: &str) -> Self {
        S3Error::new(
            StatusCode::NOT_FOUND,
            "NoSuchBucket",
            format!("The specified bucket does not exist: {bucket}"),
        )
    }

    pub fn no_such_key(key: &str) -> Self {
        S3Error::new(
            StatusCode::NOT_FOUND,
            "NoSuchKey",
            format!("The specified key does not exist: {key}"),
        )
    }

    pub fn bucket_not_empty(bucket: &str) -> Self {
        S3Error::new(
            StatusCode::CONFLICT,
            "BucketNotEmpty",
            format!("The bucket you tried to delete is not empty: {bucket}"),
        )
    }

    pub fn invalid_request(message: impl Into<String>) -> Self {
        S3Error::new(StatusCode::BAD_REQUEST, "InvalidRequest", message)
    }

    pub fn invalid_key(message: impl Into<String>) -> Self {
        S3Error::new(StatusCode::BAD_REQUEST, "InvalidArgument", message)
    }

    pub fn entity_too_large(limit: u64) -> Self {
        S3Error::new(
            StatusCode::BAD_REQUEST,
            "EntityTooLarge",
            format!("Your proposed upload exceeds the maximum allowed size of {limit} bytes"),
        )
    }

    pub fn not_implemented(operation: &str) -> Self {
        S3Error::new(
            StatusCode::NOT_IMPLEMENTED,
            "NotImplemented",
            format!("Operation '{operation}' is not implemented by this storage service"),
        )
    }

    pub fn internal(message: impl Into<String>) -> Self {
        S3Error::new(StatusCode::INTERNAL_SERVER_ERROR, "InternalError", message)
    }

    /// Renders the S3 `<Error>` document.
    pub fn render(&self, request_id: &str) -> String {
        let root = Element::new("Error")
            .with(Element::text("Code", self.code))
            .with(Element::text("Message", &self.message))
            .with(Element::text("RequestId", request_id))
            .with(Element::text("StorageService", "moonwitness-storage"));
        xml::document(root)
    }
}

impl From<SigV4Error> for S3Error {
    fn from(err: SigV4Error) -> Self {
        let status = match err {
            SigV4Error::SignatureMismatch => StatusCode::FORBIDDEN,
            SigV4Error::UnknownAccessKey => StatusCode::FORBIDDEN,
            SigV4Error::Expired => StatusCode::FORBIDDEN,
            SigV4Error::MissingDate => StatusCode::FORBIDDEN,
            SigV4Error::Malformed(_) => StatusCode::BAD_REQUEST,
        };
        S3Error::new(status, err.as_str(), err.message())
    }
}

impl From<sqlx::Error> for S3Error {
    fn from(err: sqlx::Error) -> Self {
        tracing::error!(error = %err, "database error");
        S3Error::internal("internal database error")
    }
}

impl From<anyhow::Error> for S3Error {
    fn from(err: anyhow::Error) -> Self {
        tracing::error!(error = %err, "internal error");
        S3Error::internal("internal error")
    }
}

impl IntoResponse for S3Error {
    fn into_response(self) -> Response {
        let request_id = request_id_from_extensions();
        let body = self.render(&request_id);
        let mut response = (self.status, body).into_response();
        response
            .headers_mut()
            .insert("content-type", "application/xml".parse().unwrap());
        response.headers_mut().insert(
            "x-amz-request-id",
            request_id
                .parse()
                .unwrap_or_else(|_| axum::http::HeaderValue::from_static("unknown")),
        );
        response
    }
}

fn request_id_from_extensions() -> String {
    // Errors are rendered outside of a handler, so a fresh id is generated.
    uuid::Uuid::new_v4().to_string()
}

/// Convenience alias used across the S3 handlers.
pub type S3Result<T> = Result<T, S3Error>;
