//! Shared state, path resolution, and request parsing for the S3 layer.

use std::collections::BTreeMap;
use std::path::PathBuf;
use std::sync::Arc;

use axum::http::HeaderMap;

use crate::config::Config;
use crate::db::Pool;
use crate::s3::errors::{S3Error, S3Result};
use crate::sigv4::{self, SigV4Error};

pub const DEFAULT_REGION: &str = "us-east-1";
pub const SERVICE_NAME: &str = "s3";

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<Config>,
    pub pool: Pool,
}

impl AppState {
    pub fn new(config: Config, pool: Pool) -> Self {
        AppState {
            config: Arc::new(config),
            pool,
        }
    }

    /// Absolute path of a bucket directory.
    pub fn bucket_dir(&self, bucket: &str) -> PathBuf {
        self.config.storage_root_path().join(bucket)
    }

    /// Absolute path of an object blob, validated against traversal.
    pub fn object_path(&self, bucket: &str, key: &str) -> S3Result<PathBuf> {
        let relative = safe_relative_path(key)?;
        Ok(self.config.storage_root_path().join(bucket).join(relative))
    }

    /// Absolute path of a multipart part blob.
    pub fn part_path(&self, upload_id: &str, part_number: i64) -> S3Result<PathBuf> {
        let id = safe_component(upload_id, "upload id")?;
        Ok(self
            .config
            .storage_root_path()
            .join(".multipart")
            .join(id)
            .join(format!("{part_number:05}.part")))
    }

    pub fn multipart_dir(&self, upload_id: &str) -> S3Result<PathBuf> {
        let id = safe_component(upload_id, "upload id")?;
        Ok(self.config.storage_root_path().join(".multipart").join(id))
    }
}

impl Config {
    pub fn storage_root_path(&self) -> PathBuf {
        PathBuf::from(&self.storage_root)
    }
}

/// Validates a bucket name against the S3 naming rules.
pub fn validate_bucket_name(name: &str) -> S3Result<()> {
    let valid = (3..=63).contains(&name.len())
        && name
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || matches!(c, '-' | '.'))
        && name.starts_with(|c: char| c.is_ascii_lowercase() || c.is_ascii_digit())
        && name.ends_with(|c: char| c.is_ascii_lowercase() || c.is_ascii_digit())
        && !name.contains("..")
        && !name.split('.').any(|label| label.is_empty());
    if valid {
        Ok(())
    } else {
        Err(S3Error::invalid_request(format!(
            "invalid bucket name '{name}': use 3-63 lowercase letters, digits, '-' or '.'"
        )))
    }
}

/// Rejects keys that escape the storage root or contain control characters.
pub fn safe_relative_path(key: &str) -> S3Result<PathBuf> {
    if key.is_empty() {
        return Err(S3Error::invalid_key("object key must not be empty"));
    }
    if key.len() > 1024 {
        return Err(S3Error::invalid_key(
            "object key must be 1024 bytes or fewer",
        ));
    }
    if key.starts_with('/') || key.contains('\0') || key.chars().any(|c| c.is_control()) {
        return Err(S3Error::invalid_key(
            "object key contains illegal characters",
        ));
    }

    let mut out = PathBuf::new();
    for segment in key.split('/') {
        match segment {
            "" | "." => continue,
            ".." => return Err(S3Error::invalid_key("object key must not contain '..'")),
            other => out.push(other),
        }
    }

    if out.as_os_str().is_empty() {
        return Err(S3Error::invalid_key("object key must name an object"));
    }
    Ok(out)
}

/// Validates a single path component (used for upload ids).
pub fn safe_component(value: &str, what: &str) -> S3Result<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() || trimmed.len() > 128 {
        return Err(S3Error::invalid_key(format!("invalid {what}")));
    }
    if !trimmed
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.'))
    {
        return Err(S3Error::invalid_key(format!("invalid {what}")));
    }
    if trimmed.contains("..") {
        return Err(S3Error::invalid_key(format!("invalid {what}")));
    }
    Ok(trimmed.to_string())
}

/// The authenticated principal for a request.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Principal {
    Anonymous,
    AccessKey(String),
}

/// Verifies SigV4 for a request, honouring the anonymous development mode.
pub fn authenticate(
    state: &AppState,
    method: &str,
    raw_query: &str,
    canonical_uri: &str,
    headers: &HeaderMap,
) -> S3Result<Principal> {
    if state.config.allow_anonymous {
        return Ok(Principal::Anonymous);
    }

    let header_map = collect_signed_headers(headers);
    let query = parse_query(raw_query);

    if let Some(auth_header) = header_map.get("authorization") {
        let parsed = sigv4::parse_authorization(auth_header)?;
        if parsed.access_key != state.config.access_key {
            return Err(SigV4Error::UnknownAccessKey.into());
        }
        let payload_hash = header_map
            .get("x-amz-content-sha256")
            .cloned()
            .unwrap_or_else(|| empty_sha256().to_string());
        sigv4::verify_header(
            &state.config.secret_key,
            method,
            canonical_uri,
            &sigv4::canonical_query_string(&query),
            &header_map,
            &parsed.signed_headers,
            &parsed.signature,
            &parsed.credential_scope,
            &payload_hash,
            DEFAULT_REGION,
            SERVICE_NAME,
            chrono::Utc::now(),
        )?;
        return Ok(Principal::AccessKey(parsed.access_key));
    }

    // Presigned URL: X-Amz-Algorithm / X-Amz-Credential / X-Amz-Date /
    // X-Amz-Expires / X-Amz-SignedHeaders / X-Amz-Signature.
    let algorithm = query
        .iter()
        .find(|(k, _)| k.eq_ignore_ascii_case("x-amz-algorithm"))
        .map(|(_, v)| v.clone());
    if let Some(algorithm) = algorithm {
        if algorithm != "AWS4-HMAC-SHA256" {
            return Err(SigV4Error::Malformed(format!(
                "unsupported presigned algorithm '{algorithm}'"
            ))
            .into());
        }
        let credential = query
            .iter()
            .find(|(k, _)| k.eq_ignore_ascii_case("x-amz-credential"))
            .map(|(_, v)| v.clone())
            .ok_or_else(|| SigV4Error::Malformed("missing X-Amz-Credential".into()))?;
        let access_key = credential.split('/').next().unwrap_or_default().to_string();
        if access_key != state.config.access_key {
            return Err(SigV4Error::UnknownAccessKey.into());
        }
        let amz_date = query
            .iter()
            .find(|(k, _)| k.eq_ignore_ascii_case("x-amz-date"))
            .map(|(_, v)| v.clone())
            .ok_or(SigV4Error::MissingDate)?;
        let expires: i64 = query
            .iter()
            .find(|(k, _)| k.eq_ignore_ascii_case("x-amz-expires"))
            .map(|(_, v)| v.parse::<i64>().unwrap_or(0))
            .unwrap_or(0);
        let signature = query
            .iter()
            .find(|(k, _)| k.eq_ignore_ascii_case("x-amz-signature"))
            .map(|(_, v)| v.clone())
            .ok_or_else(|| SigV4Error::Malformed("missing X-Amz-Signature".into()))?;

        let mut presign_headers = BTreeMap::new();
        presign_headers.insert(
            "host".to_string(),
            header_map.get("host").cloned().unwrap_or_default(),
        );

        sigv4::verify_presigned(
            &state.config.secret_key,
            method,
            canonical_uri,
            &sigv4::canonical_query_string(&query),
            expires,
            &amz_date,
            &signature,
            &credential,
            "UNSIGNED-PAYLOAD",
            DEFAULT_REGION,
            SERVICE_NAME,
            chrono::Utc::now(),
        )?;
        return Ok(Principal::AccessKey(access_key));
    }

    Err(S3Error::new(
        axum::http::StatusCode::FORBIDDEN,
        "AccessDenied",
        "authentication required: provide an Authorization header or a presigned URL",
    ))
}

fn collect_signed_headers(headers: &HeaderMap) -> BTreeMap<String, String> {
    let mut out = BTreeMap::new();
    for (name, value) in headers.iter() {
        let key = name.as_str().to_ascii_lowercase();
        if let Ok(value) = value.to_str() {
            out.insert(key, value.trim().to_string());
        }
    }
    out
}

/// Parses a raw query string into decoded key/value pairs.
pub fn parse_query(raw: &str) -> Vec<(String, String)> {
    if raw.is_empty() {
        return Vec::new();
    }
    raw.split('&')
        .filter(|s| !s.is_empty())
        .map(|pair| match pair.split_once('=') {
            Some((k, v)) => (percent_decode(k), percent_decode(v)),
            None => (percent_decode(pair), String::new()),
        })
        .collect()
}

/// Decodes `application/x-www-form-urlencoded` escapes, including `+` as space.
pub fn percent_decode(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut out: Vec<u8> = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        match bytes[i] {
            b'%' if i + 2 < bytes.len() => {
                let hi = (bytes[i + 1] as char).to_digit(16);
                let lo = (bytes[i + 2] as char).to_digit(16);
                match (hi, lo) {
                    (Some(hi), Some(lo)) => {
                        out.push((hi * 16 + lo) as u8);
                        i += 3;
                    }
                    _ => {
                        out.push(bytes[i]);
                        i += 1;
                    }
                }
            }
            b'+' => {
                out.push(b' ');
                i += 1;
            }
            b => {
                out.push(b);
                i += 1;
            }
        }
    }
    String::from_utf8_lossy(&out).into_owned()
}

pub fn empty_sha256() -> &'static str {
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}

/// Parses a byte-range header (`bytes=start-end`, `bytes=start-`, `bytes=-suffix`).
pub fn parse_range(header: &str, total: u64) -> Option<(u64, u64)> {
    let spec = header.strip_prefix("bytes=")?.trim();
    if spec.contains(',') {
        return None;
    }
    let (start, end) = spec.split_once('-')?;

    if start.is_empty() {
        let suffix: u64 = end.trim().parse().ok()?;
        if suffix == 0 {
            return None;
        }
        let start = total.saturating_sub(suffix);
        return Some((start, total.saturating_sub(1)));
    }

    let start: u64 = start.trim().parse().ok()?;
    if start >= total {
        return None;
    }
    let end = if end.trim().is_empty() {
        total.saturating_sub(1)
    } else {
        end.trim().parse::<u64>().ok()?.min(total - 1)
    };
    if end < start {
        return None;
    }
    Some((start, end))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_valid_bucket_names() {
        assert!(validate_bucket_name("moonwitness-assets").is_ok());
        assert!(validate_bucket_name("abc").is_ok());
    }

    #[test]
    fn rejects_invalid_bucket_names() {
        assert!(validate_bucket_name("ab").is_err());
        assert!(validate_bucket_name("Alpha").is_err());
        assert!(validate_bucket_name("has_underscore").is_err());
        assert!(validate_bucket_name("-leading").is_err());
    }

    #[test]
    fn rejects_traversal_keys() {
        assert!(safe_relative_path("../etc/passwd").is_err());
        assert!(safe_relative_path("a/../../b").is_err());
        assert!(safe_relative_path("/abs").is_err());
        assert!(safe_relative_path("").is_err());
    }

    #[test]
    fn normalizes_duplicate_slashes() {
        assert_eq!(
            safe_relative_path("a//b/./c.txt").unwrap(),
            PathBuf::from("a").join("b").join("c.txt")
        );
    }

    #[test]
    fn parses_ranges() {
        assert_eq!(parse_range("bytes=0-99", 1000), Some((0, 99)));
        assert_eq!(parse_range("bytes=100-", 1000), Some((100, 999)));
        assert_eq!(parse_range("bytes=-100", 1000), Some((900, 999)));
        assert_eq!(parse_range("bytes=2000-3000", 1000), None);
    }

    #[test]
    fn decodes_percent_escapes() {
        assert_eq!(percent_decode("a%20b+c"), "a b c");
    }
}
