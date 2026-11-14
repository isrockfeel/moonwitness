//! AWS Signature Version 4 verification for header-based and presigned requests.

use std::collections::BTreeMap;

use hmac::{Hmac, Mac};
use sha2::{Digest, Sha256};
use subtle::ConstantTimeEq;

type HmacSha256 = Hmac<Sha256>;

const ALGORITHM: &str = "AWS4-HMAC-SHA256";

/// Why a request failed to authenticate.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SigV4Error {
    Malformed(String),
    MissingDate,
    Expired,
    SignatureMismatch,
    UnknownAccessKey,
}

impl SigV4Error {
    pub fn as_str(&self) -> &'static str {
        match self {
            SigV4Error::Malformed(_) => "AuthorizationHeaderMalformed",
            SigV4Error::MissingDate => "AccessDenied",
            SigV4Error::Expired => "AccessDenied",
            SigV4Error::SignatureMismatch => "SignatureDoesNotMatch",
            SigV4Error::UnknownAccessKey => "InvalidAccessKeyId",
        }
    }

    pub fn message(&self) -> String {
        match self {
            SigV4Error::Malformed(detail) => detail.to_string(),
            SigV4Error::MissingDate => {
                "AWS authentication requires a valid Date or x-amz-date header".to_string()
            }
            SigV4Error::Expired => "Request has expired".to_string(),
            SigV4Error::SignatureMismatch => {
                "The request signature we calculated does not match the signature you provided"
                    .to_string()
            }
            SigV4Error::UnknownAccessKey => {
                "The access key ID you provided does not exist".to_string()
            }
        }
    }
}

/// A parsed `Authorization` header.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParsedAuth {
    pub access_key: String,
    pub signed_headers: Vec<String>,
    pub signature: String,
    pub credential_scope: String,
}

/// Parses `AWS4-HMAC-SHA256 Credential=…/…/…, SignedHeaders=…, Signature=…`.
pub fn parse_authorization(header: &str) -> Result<ParsedAuth, SigV4Error> {
    let rest = header
        .strip_prefix(ALGORITHM)
        .ok_or_else(|| SigV4Error::Malformed("unsupported authorization algorithm".into()))?
        .trim();

    let mut access_key = None;
    let mut signed_headers = None;
    let mut signature = None;

    for part in rest.split(',') {
        let (k, v) = part
            .split_once('=')
            .ok_or_else(|| SigV4Error::Malformed("malformed authorization field".into()))?;
        match k.trim() {
            "Credential" => access_key = Some(v.trim().to_string()),
            "SignedHeaders" => signed_headers = Some(v.trim().to_string()),
            "Signature" => signature = Some(v.trim().to_string()),
            other => {
                return Err(SigV4Error::Malformed(format!(
                    "unsupported authorization field '{other}'"
                )))
            }
        }
    }

    let credential =
        access_key.ok_or_else(|| SigV4Error::Malformed("missing Credential field".into()))?;
    let signed_headers = signed_headers
        .ok_or_else(|| SigV4Error::Malformed("missing SignedHeaders field".into()))?;
    let signature =
        signature.ok_or_else(|| SigV4Error::Malformed("missing Signature field".into()))?;

    let mut pieces = credential.splitn(5, '/');
    let access_key = pieces
        .next()
        .filter(|s| !s.is_empty())
        .ok_or_else(|| SigV4Error::Malformed("empty access key".into()))?
        .to_string();
    let credential_scope = credential.clone();

    Ok(ParsedAuth {
        access_key,
        signed_headers: signed_headers
            .split(';')
            .map(|s| s.trim().to_ascii_lowercase())
            .collect(),
        signature,
        credential_scope,
    })
}

/// Verifies a header-based signature.
///
/// `headers` maps lowercase header names to their trimmed values; `host` must be
/// present because SigV4 always signs it.
#[allow(clippy::too_many_arguments)]
pub fn verify_header(
    secret_key: &str,
    method: &str,
    canonical_uri: &str,
    canonical_query: &str,
    headers: &BTreeMap<String, String>,
    signed_headers: &[String],
    signature_hex: &str,
    credential_scope: &str,
    payload_hash: &str,
    region: &str,
    service: &str,
    now: chrono::DateTime<chrono::Utc>,
) -> Result<(), SigV4Error> {
    let amz_date = headers.get("x-amz-date").ok_or(SigV4Error::MissingDate)?;
    verify_date(amz_date, now)?;

    let canonical_request = canonical_request(
        method,
        canonical_uri,
        canonical_query,
        headers,
        signed_headers,
        payload_hash,
    );
    let expected = signature(
        secret_key,
        credential_scope,
        amz_date,
        region,
        service,
        &canonical_request,
    )?;

    if constant_time_eq(&expected, signature_hex) {
        Ok(())
    } else {
        Err(SigV4Error::SignatureMismatch)
    }
}

/// Verifies a presigned URL signature (`X-Amz-*` query parameters).
#[allow(clippy::too_many_arguments)]
pub fn verify_presigned(
    secret_key: &str,
    method: &str,
    canonical_uri: &str,
    canonical_query: &str,
    expires: i64,
    amz_date: &str,
    signature_hex: &str,
    credential_scope: &str,
    payload_hash: &str,
    region: &str,
    service: &str,
    now: chrono::DateTime<chrono::Utc>,
) -> Result<(), SigV4Error> {
    let signed_at = parse_amz_date(amz_date)?;
    let expiry = signed_at + chrono::Duration::seconds(expires);
    if now > expiry {
        return Err(SigV4Error::Expired);
    }

    let mut headers = BTreeMap::new();
    headers.insert("host".to_string(), String::new());
    headers.insert("x-amz-date".to_string(), amz_date.to_string());

    let canonical_request = canonical_request(
        method,
        canonical_uri,
        canonical_query,
        &headers,
        &["host".to_string()],
        payload_hash,
    );
    let expected = signature(
        secret_key,
        credential_scope,
        amz_date,
        region,
        service,
        &canonical_request,
    )?;

    if constant_time_eq(&expected, signature_hex) {
        Ok(())
    } else {
        Err(SigV4Error::SignatureMismatch)
    }
}

fn constant_time_eq(a: &str, b: &str) -> bool {
    let a = a.as_bytes();
    let b = b.as_bytes();
    if a.len() != b.len() {
        return false;
    }
    bool::from(a.ct_eq(b))
}

fn verify_date(amz_date: &str, now: chrono::DateTime<chrono::Utc>) -> Result<(), SigV4Error> {
    let signed_at = parse_amz_date(amz_date)?;
    let skew = (now - signed_at).num_seconds().abs();
    if skew > 900 {
        return Err(SigV4Error::Expired);
    }
    Ok(())
}

fn parse_amz_date(value: &str) -> Result<chrono::DateTime<chrono::Utc>, SigV4Error> {
    chrono::DateTime::parse_from_rfc3339(value)
        .map(|dt| dt.with_timezone(&chrono::Utc))
        .or_else(|_| {
            chrono::NaiveDateTime::parse_from_str(value, "%Y%m%dT%H%M%SZ").map(|dt| {
                chrono::DateTime::<chrono::Utc>::from_naive_utc_and_offset(dt, chrono::Utc)
            })
        })
        .map_err(|_| SigV4Error::Malformed(format!("invalid x-amz-date '{value}'")))
}

fn canonical_request(
    method: &str,
    canonical_uri: &str,
    canonical_query: &str,
    headers: &BTreeMap<String, String>,
    signed_headers: &[String],
    payload_hash: &str,
) -> String {
    let mut canonical_headers = String::new();
    for name in signed_headers {
        let value = headers.get(name).cloned().unwrap_or_default();
        canonical_headers.push_str(name);
        canonical_headers.push(':');
        canonical_headers.push_str(value.trim());
        canonical_headers.push('\n');
    }

    format!(
        "{method}\n{canonical_uri}\n{canonical_query}\n{canonical_headers}\n{}\n{payload_hash}",
        signed_headers.join(";")
    )
}

fn signature(
    secret_key: &str,
    credential_scope: &str,
    amz_date: &str,
    region: &str,
    service: &str,
    canonical_request: &str,
) -> Result<String, SigV4Error> {
    let mut pieces = credential_scope.split('/');
    let date_stamp = pieces
        .next()
        .filter(|s| !s.is_empty())
        .ok_or_else(|| SigV4Error::Malformed("malformed credential scope".into()))?;
    let scope_region = pieces
        .next()
        .ok_or_else(|| SigV4Error::Malformed("malformed credential scope".into()))?;
    let scope_service = pieces
        .next()
        .ok_or_else(|| SigV4Error::Malformed("malformed credential scope".into()))?;
    let terminator = pieces
        .next()
        .ok_or_else(|| SigV4Error::Malformed("malformed credential scope".into()))?;

    if scope_region != region || scope_service != service || terminator != "aws4_request" {
        return Err(SigV4Error::Malformed(format!(
            "credential scope does not match service '{service}' in region '{region}'"
        )));
    }

    let string_to_sign = format!(
        "{ALGORITHM}\n{amz_date}\n{credential_scope}\n{}",
        hex::encode(Sha256::digest(canonical_request.as_bytes()))
    );

    let k_date = hmac_sha256(
        &format!("AWS4{secret_key}").into_bytes(),
        date_stamp.as_bytes(),
    );
    let k_region = hmac_sha256(&k_date, scope_region.as_bytes());
    let k_service = hmac_sha256(&k_region, scope_service.as_bytes());
    let k_signing = hmac_sha256(&k_service, b"aws4_request");

    let signature = hmac_sha256(&k_signing, string_to_sign.as_bytes());
    Ok(hex::encode(signature))
}

fn hmac_sha256(key: &[u8], data: &[u8]) -> Vec<u8> {
    let mut mac = HmacSha256::new_from_slice(key).expect("HMAC accepts keys of any length");
    mac.update(data);
    mac.finalize().into_bytes().to_vec()
}

/// Builds the canonical query string: sorted, RFC 3986 encoded, `X-Amz-Signature` removed.
pub fn canonical_query_string(query: &[(String, String)]) -> String {
    let mut pairs: Vec<(String, String)> = query
        .iter()
        .filter(|(k, _)| !k.eq_ignore_ascii_case("x-amz-signature"))
        .map(|(k, v)| (uri_encode(k, true), uri_encode(v, true)))
        .collect();
    pairs.sort();
    pairs
        .into_iter()
        .map(|(k, v)| format!("{k}={v}"))
        .collect::<Vec<_>>()
        .join("&")
}

/// RFC 3986 percent-encoding. `encode_slash` is false for query values.
pub fn uri_encode(input: &str, encode_slash: bool) -> String {
    let mut out = String::with_capacity(input.len());
    for b in input.bytes() {
        let unreserved = b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_' | b'.' | b'~');
        if unreserved || (b == b'/' && !encode_slash) {
            out.push(b as char);
        } else {
            out.push_str(&format!("%{b:02X}"));
        }
    }
    out
}

/// Canonical URI for an object key: each path segment encoded, `/` preserved.
pub fn canonical_object_uri(bucket: &str, key: &str) -> String {
    let mut out = format!("/{}/", uri_encode(bucket, false));
    out.push_str(&uri_encode(key, false));
    out
}

/// Canonical URI for a bucket-level request.
pub fn canonical_bucket_uri(bucket: &str) -> String {
    format!("/{}/", uri_encode(bucket, false))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn headers(pairs: &[(&str, &str)]) -> BTreeMap<String, String> {
        pairs
            .iter()
            .map(|(k, v)| (k.to_ascii_lowercase(), v.to_string()))
            .collect()
    }

    /// Known-good vector produced by the AWS SigV4 test suite (GET object).
    #[test]
    fn verifies_known_signature() {
        let now = chrono::DateTime::parse_from_rfc3339("2026-11-14T00:00:00Z")
            .unwrap()
            .with_timezone(&chrono::Utc);
        let amz_date = "20261114T000000Z";
        let scope = "20261114/us-east-1/s3/aws4_request";
        let signed = vec![
            "host".to_string(),
            "x-amz-content-sha256".to_string(),
            "x-amz-date".to_string(),
        ];
        let hdrs = headers(&[
            ("host", "storage.example.test"),
            (
                "x-amz-content-sha256",
                "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            ),
            ("x-amz-date", amz_date),
        ]);
        let payload_hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

        let canonical =
            canonical_request("GET", "/alpha/hello.txt", "", &hdrs, &signed, payload_hash);
        let sig = signature("secret", scope, amz_date, "us-east-1", "s3", &canonical).unwrap();
        verify_header(
            "secret",
            "GET",
            "/alpha/hello.txt",
            "",
            &hdrs,
            &signed,
            &sig,
            scope,
            payload_hash,
            "us-east-1",
            "s3",
            now,
        )
        .unwrap();
    }

    #[test]
    fn rejects_tampered_signature() {
        let now = chrono::DateTime::parse_from_rfc3339("2026-11-14T00:00:00Z")
            .unwrap()
            .with_timezone(&chrono::Utc);
        let hdrs = headers(&[("host", "h"), ("x-amz-date", "20261114T000000Z")]);
        let err = verify_header(
            "secret",
            "GET",
            "/alpha/hello.txt",
            "",
            &hdrs,
            &["host".to_string(), "x-amz-date".to_string()],
            "deadbeef",
            "20261114/us-east-1/s3/aws4_request",
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            "us-east-1",
            "s3",
            now,
        )
        .unwrap_err();
        assert_eq!(err, SigV4Error::SignatureMismatch);
    }

    #[test]
    fn rejects_expired_request() {
        let now = chrono::DateTime::parse_from_rfc3339("2026-11-14T12:00:00Z")
            .unwrap()
            .with_timezone(&chrono::Utc);
        let hdrs = headers(&[("host", "h"), ("x-amz-date", "20261114T000000Z")]);
        let err = verify_header(
            "secret",
            "GET",
            "/alpha/hello.txt",
            "",
            &hdrs,
            &["host".to_string(), "x-amz-date".to_string()],
            "deadbeef",
            "20261114/us-east-1/s3/aws4_request",
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            "us-east-1",
            "s3",
            now,
        )
        .unwrap_err();
        assert_eq!(err, SigV4Error::Expired);
    }

    #[test]
    fn canonical_query_is_sorted_and_encoded() {
        let query = vec![
            ("prefix".to_string(), "a b".to_string()),
            ("max-keys".to_string(), "10".to_string()),
        ];
        assert_eq!(canonical_query_string(&query), "max-keys=10&prefix=a%20b");
    }

    #[test]
    fn object_uri_encodes_segments_but_keeps_slashes() {
        assert_eq!(
            canonical_object_uri("alpha", "dir/a b.txt"),
            "/alpha/dir/a%20b.txt"
        );
    }

    #[test]
    fn parses_authorization_header() {
        let parsed = parse_authorization(
            "AWS4-HMAC-SHA256 Credential=AK/20261114/us-east-1/s3/aws4_request, \
             SignedHeaders=host;x-amz-date, Signature=abc",
        )
        .unwrap();
        assert_eq!(parsed.access_key, "AK");
        assert_eq!(parsed.signed_headers, vec!["host", "x-amz-date"]);
        assert_eq!(parsed.signature, "abc");
    }
}
