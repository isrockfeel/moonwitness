//! End-to-end tests for the S3 API surface.

use std::net::SocketAddr;
use std::path::PathBuf;

use axum::Router;
use storage::config::Config;
use storage::db;
use storage::s3;
use storage::s3::state::AppState;
use tokio::net::TcpListener;

struct TestServer {
    base: String,
    root: PathBuf,
}

impl TestServer {
    async fn start() -> Self {
        let root = std::env::temp_dir().join(format!("mw-storage-{}", uuid::Uuid::new_v4()));
        tokio::fs::create_dir_all(&root).await.unwrap();

        let config = Config {
            host: "127.0.0.1".to_string(),
            http_port: 0,
            storage_root: root.to_string_lossy().into_owned(),
            database_url: format!("sqlite:{}?mode=rwc", root.join("storage.db").display()),
            access_key: "test-access".to_string(),
            secret_key: "test-secret".to_string(),
            allow_anonymous: true,
            max_object_size: 1024 * 1024,
        };

        let pool = db::init_db(&config.database_url).await.unwrap();
        let state = AppState::new(config, pool);
        let app: Router = s3::router(state);

        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr: SocketAddr = listener.local_addr().unwrap();
        tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });

        TestServer {
            base: format!("http://{addr}"),
            root,
        }
    }

    fn url(&self, path: &str) -> String {
        format!("{}{}", self.base, path)
    }
}

impl Drop for TestServer {
    fn drop(&mut self) {
        let root = self.root.clone();
        let _ = std::fs::remove_dir_all(root);
    }
}

#[tokio::test]
async fn health_endpoint_is_public() {
    let server = TestServer::start().await;
    let response = reqwest::get(server.url("/health")).await.unwrap();
    assert_eq!(response.status(), 200);
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["service"], "storage");
}

#[tokio::test]
async fn bucket_and_object_round_trip() {
    let server = TestServer::start().await;
    let client = reqwest::Client::new();

    let create = client
        .put(server.url("/moonwitness-assets"))
        .send()
        .await
        .unwrap();
    assert_eq!(create.status(), 200);

    let put = client
        .put(server.url("/moonwitness-assets/hello.txt"))
        .header("content-type", "text/plain")
        .body("hello world")
        .send()
        .await
        .unwrap();
    assert_eq!(put.status(), 200);
    assert!(put.headers().get("etag").is_some());

    let get = client
        .get(server.url("/moonwitness-assets/hello.txt"))
        .send()
        .await
        .unwrap();
    assert_eq!(get.status(), 200);
    assert_eq!(get.text().await.unwrap(), "hello world");

    let head = client
        .head(server.url("/moonwitness-assets/hello.txt"))
        .send()
        .await
        .unwrap();
    assert_eq!(head.status(), 200);
    assert_eq!(
        head.headers()
            .get("content-length")
            .unwrap()
            .to_str()
            .unwrap(),
        "11"
    );

    let delete = client
        .delete(server.url("/moonwitness-assets/hello.txt"))
        .send()
        .await
        .unwrap();
    assert_eq!(delete.status(), 204);

    let missing = client
        .get(server.url("/moonwitness-assets/hello.txt"))
        .send()
        .await
        .unwrap();
    assert_eq!(missing.status(), 404);
    let body = missing.text().await.unwrap();
    assert!(body.contains("<Code>NoSuchKey</Code>"));
}

#[tokio::test]
async fn range_request_returns_partial_content() {
    let server = TestServer::start().await;
    let client = reqwest::Client::new();

    client.put(server.url("/media")).send().await.unwrap();
    client
        .put(server.url("/media/clip.bin"))
        .body("0123456789")
        .send()
        .await
        .unwrap();

    let response = client
        .get(server.url("/media/clip.bin"))
        .header("range", "bytes=2-5")
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), 206);
    assert_eq!(
        response
            .headers()
            .get("content-range")
            .unwrap()
            .to_str()
            .unwrap(),
        "bytes 2-5/10"
    );
    assert_eq!(response.text().await.unwrap(), "2345");
}

#[tokio::test]
async fn list_objects_supports_prefix_and_delimiter() {
    let server = TestServer::start().await;
    let client = reqwest::Client::new();

    client.put(server.url("/site")).send().await.unwrap();
    for key in ["a.txt", "images/one.png", "images/two.png"] {
        client
            .put(server.url(&format!("/site/{key}")))
            .body("x")
            .send()
            .await
            .unwrap();
    }

    let response = client
        .get(server.url("/site?list-type=2&delimiter=/"))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), 200);
    let body = response.text().await.unwrap();
    assert!(body.contains("<Key>a.txt</Key>"));
    assert!(
        body.contains("<CommonPrefixes>") && body.contains("<Prefix>images/</Prefix>"),
        "body: {body}"
    );
    assert!(!body.contains("<Key>images/one.png</Key>"));

    let prefixed = client
        .get(server.url("/site?list-type=2&prefix=images/"))
        .send()
        .await
        .unwrap();
    let body = prefixed.text().await.unwrap();
    assert!(body.contains("<Key>images/one.png</Key>"));
    assert!(body.contains("<Key>images/two.png</Key>"));
}

#[tokio::test]
async fn multipart_upload_assembles_object() {
    let server = TestServer::start().await;
    let client = reqwest::Client::new();

    client.put(server.url("/big")).send().await.unwrap();

    let create = client
        .post(server.url("/big/stream.bin?uploads"))
        .send()
        .await
        .unwrap();
    assert_eq!(create.status(), 200);
    let body = create.text().await.unwrap();
    let upload_id = extract_tag(&body, "UploadId").expect("upload id in response");

    let mut parts = Vec::new();
    for (index, chunk) in ["aaaa", "bbbb", "cccc"].iter().enumerate() {
        let number = index + 1;
        let response = client
            .put(server.url(&format!(
                "/big/stream.bin?partNumber={number}&uploadId={upload_id}"
            )))
            .body(chunk.to_string())
            .send()
            .await
            .unwrap();
        assert_eq!(response.status(), 200);
        let etag = response
            .headers()
            .get("etag")
            .unwrap()
            .to_str()
            .unwrap()
            .to_string();
        parts.push(format!(
            "<Part><PartNumber>{number}</PartNumber><ETag>{etag}</ETag></Part>"
        ));
    }

    let complete_body = format!(
        "<CompleteMultipartUpload>{}</CompleteMultipartUpload>",
        parts.join("")
    );
    let complete = client
        .post(server.url(&format!("/big/stream.bin?uploadId={upload_id}")))
        .body(complete_body)
        .send()
        .await
        .unwrap();
    assert_eq!(complete.status(), 200);

    let get = client
        .get(server.url("/big/stream.bin"))
        .send()
        .await
        .unwrap();
    assert_eq!(get.status(), 200);
    assert_eq!(get.text().await.unwrap(), "aaaabbbbcccc");
}

#[tokio::test]
async fn delete_bucket_rejects_non_empty() {
    let server = TestServer::start().await;
    let client = reqwest::Client::new();

    client.put(server.url("/full")).send().await.unwrap();
    client
        .put(server.url("/full/keep.txt"))
        .body("data")
        .send()
        .await
        .unwrap();

    let response = client.delete(server.url("/full")).send().await.unwrap();
    assert_eq!(response.status(), 409);
    let body = response.text().await.unwrap();
    assert!(body.contains("<Code>BucketNotEmpty</Code>"));
}

#[tokio::test]
async fn rejects_path_traversal_keys() {
    let server = TestServer::start().await;
    let client = reqwest::Client::new();

    client.put(server.url("/safe")).send().await.unwrap();

    let response = client
        .put(server.url("/safe/..%2f..%2fescape.txt"))
        .body("nope")
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), 400);
    let body = response.text().await.unwrap();
    assert!(body.contains("<Code>InvalidArgument</Code>"));
}

#[tokio::test]
async fn list_buckets_returns_created_buckets() {
    let server = TestServer::start().await;
    let client = reqwest::Client::new();

    client.put(server.url("/one")).send().await.unwrap();
    client.put(server.url("/two")).send().await.unwrap();

    let response = client.get(server.url("/")).send().await.unwrap();
    assert_eq!(response.status(), 200);
    let body = response.text().await.unwrap();
    assert!(body.contains("<Name>one</Name>"));
    assert!(body.contains("<Name>two</Name>"));
}

fn extract_tag(input: &str, tag: &str) -> Option<String> {
    let open = format!("<{tag}>");
    let close = format!("</{tag}>");
    let start = input.find(&open)? + open.len();
    let end = input[start..].find(&close)? + start;
    Some(input[start..end].trim().to_string())
}
