# Storage Service

S3-compatible object storage service for Moonwitness (Rust/axum + SQLite metadata). Stores object data on the local filesystem under `STORAGE_ROOT` and object/bucket metadata in SQLite. Implements a subset of the S3 API with AWS Signature V4 authentication (header and presigned URL).

## Run

```sh
cp .env.example .env
cargo run
```

Default HTTP: `127.0.0.1:8091`.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Bind host |
| `HTTP_PORT` | `8091` | HTTP API port |
| `STORAGE_ROOT` | `./data` | Filesystem root for object data (resolved to canonical path at startup) |
| `DATABASE_URL` | `sqlite:./storage.db?mode=rwc` | SQLite database path/URL for bucket/object metadata |
| `STORAGE_ACCESS_KEY` | `moonwitness-storage` | Access key for SigV4 auth |
| `STORAGE_SECRET_KEY` | `change-me-storage-secret` | Secret key for SigV4 auth |
| `STORAGE_ALLOW_ANONYMOUS` | `false` | If `true`, all requests are accepted without signature (**dev only, never in production**) |
| `STORAGE_MAX_OBJECT_SIZE` | `536870912` (512 MiB) | Max object/body size in bytes |

## Authentication

- **AWS Signature V4**: header-based signing and presigned URL query signing are supported. Requests must be signed with `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY`.
- **Anonymous mode**: when `STORAGE_ALLOW_ANONYMOUS=true`, signature verification is skipped (for local development only).
- Region is treated as `us-east-1`/`auto` for signing compatibility; service name is `s3`.
- Responses include `x-amz-request-id`.

## HTTP API (S3 subset)

Base URL: `http://<HOST>:<HTTP_PORT>`

### Health
- `GET /health`
  - `200 OK` → `{"status":"ok","service":"storage"}`

### Service / Buckets
- `GET /` — ListBuckets
  - `200 OK` → XML `ListAllMyBucketsResult` with `<Buckets><Bucket><Name>...</Name><CreationDate>...</CreationDate></Bucket>...</Buckets>`
- `PUT /{bucket}` — CreateBucket
  - `200 OK`, `Location: /{bucket}` (idempotent if bucket exists)
  - `400` if bucket name invalid
- `HEAD /{bucket}` — HeadBucket
  - `200 OK` if exists, `404` if not found
- `GET /{bucket}?location` — GetBucketLocation
  - `200 OK` → XML location constraint
- `DELETE /{bucket}` — DeleteBucket
  - `204 No Content` on success
  - `404` if not found, `409` if bucket not empty
- `GET /{bucket}` — ListObjects / ListObjectsV2
  - Query params:
    - `list-type` (1 or 2; v2 when `2`)
    - `prefix`, `delimiter`, `max-keys`
    - v1: `marker`
    - v2: `continuation-token`
  - `200 OK` → XML `ListBucketResult` (v1) or `ListObjectsV2Result` (v2) with `Contents`, `CommonPrefixes`, truncation info
- `GET /{bucket}?uploads` — ListMultipartUploads
  - `200 OK` → XML `ListMultipartUploadsResult`

### Objects
- `PUT /{bucket}/{key}` — PutObject or CopyObject
  - Body: raw object bytes (or empty for copy)
  - Headers:
    - `Content-Type` (optional)
    - `x-amz-meta-*` (optional user metadata)
    - `x-amz-copy-source` (optional) — if set, performs server-side copy from `/{sourceBucket}/{sourceKey}`
  - `200 OK` with `ETag` header (`"<sha256-hex>"`)
  - `413 Entity Too Large` if body exceeds `STORAGE_MAX_OBJECT_SIZE`
  - `404` if bucket (or copy source) not found
- `GET /{bucket}/{key}` — GetObject
  - `200 OK` (or `206 Partial Content` with `Range: bytes=start-end`)
  - Headers: `ETag`, `Content-Type`, `Content-Length`, `Last-Modified`, `Accept-Ranges: bytes`, `x-amz-meta-*`
  - `404` if not found, `416` if range not satisfiable
- `HEAD /{bucket}/{key}` — HeadObject
  - Same headers as GET, no body
  - `200 OK` or `404`
- `DELETE /{bucket}/{key}` — DeleteObject
  - `204 No Content` (idempotent)

### Multipart Uploads
- `POST /{bucket}/{key}?uploads` — CreateMultipartUpload
  - Headers: `Content-Type`, `x-amz-meta-*` (optional)
  - `200 OK` → XML `InitiateMultipartUploadResult` with `<Bucket>`, `<Key>`, `<UploadId>`
- `PUT /{bucket}/{key}?partNumber=N&uploadId=ID` — UploadPart
  - Body: part bytes
  - `200 OK` with `ETag` header
- `GET /{bucket}/{key}?uploadId=ID` — ListParts
  - `200 OK` → XML `ListPartsResult`
- `POST /{bucket}/{key}?uploadId=ID` — CompleteMultipartUpload
  - Body: XML `<CompleteMultipartUpload><Part><PartNumber>..</PartNumber><ETag>..</ETag></Part>...</CompleteMultipartUpload>`
  - `200 OK` → XML `CompleteMultipartUploadResult` with final `ETag`, `Location`
- `DELETE /{bucket}/{key}?uploadId=ID` — AbortMultipartUpload
  - `204 No Content`

## Error Responses

Errors are returned as S3-style XML:

```xml
<Error>
  <Code>NoSuchKey</Code>
  <Message>The specified key does not exist.</Message>
  <Resource>/bucket/key</Resource>
  <RequestId>...</RequestId>
</Error>
```

Common codes: `AccessDenied`, `NoSuchBucket`, `NoSuchKey`, `BucketNotEmpty`, `EntityTooLarge`, `InvalidBucketName`, `InvalidRequest`, `NoSuchUpload`, `NotImplemented`, `SignatureDoesNotMatch`, `InternalError`.

## Notes

- `apps/api` proxies this service at `/api/v1/storage/*` when `STORAGE_URL` is configured (path-based proxy; S3 clients should target the API proxy or the service directly with proper SigV4).
- **Path traversal protection**: bucket/key components are validated and resolved against `STORAGE_ROOT` (canonicalized) to prevent escaping the storage directory.
- **ETag**: computed as hex SHA-256 of object content (not MD5). For multipart completion, the final ETag follows the service's implementation (see `objects.rs`).
- Object metadata is stored in SQLite; object bytes are stored on disk under `STORAGE_ROOT/<bucket>/<key>`.
- CORS is permissive at the service level; restrict at the API/proxy layer in production.
- This is a data-plane storage service; IAM/policy, quotas, and lifecycle management belong in the control plane (`cp/`).