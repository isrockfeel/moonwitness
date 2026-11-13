pub mod config;
pub mod db;
pub mod models;
pub mod s3;
pub mod sigv4;
pub mod xml;

use axum::Router;
use tower::ServiceBuilder;
use tower_http::{cors::CorsLayer, trace::TraceLayer};

use config::Config;
use db::init_db;
use s3::state::AppState;

pub async fn run() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    let config = Config::from_env()?;
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .json()
        .init();

    if config.allow_anonymous {
        tracing::warn!(
            "STORAGE_ALLOW_ANONYMOUS is enabled: every request is accepted without a signature. \
             Never use this in production."
        );
    }

    let root = std::path::PathBuf::from(&config.storage_root);
    tokio::fs::create_dir_all(&root).await?;
    let root = root.canonicalize().map_err(|e| {
        anyhow::anyhow!("cannot resolve STORAGE_ROOT '{}': {e}", config.storage_root)
    })?;
    let mut config = config;
    config.storage_root = root.to_string_lossy().into_owned();

    let pool = init_db(&config.database_url).await?;
    let state = AppState::new(config.clone(), pool);

    let app = Router::new().merge(s3::router(state)).layer(
        ServiceBuilder::new()
            .layer(TraceLayer::new_for_http())
            .layer(CorsLayer::permissive()),
    );

    let listener =
        tokio::net::TcpListener::bind(format!("{}:{}", config.host, config.http_port)).await?;
    tracing::info!(
        host = %config.host,
        http_port = config.http_port,
        storage_root = %config.storage_root,
        allow_anonymous = config.allow_anonymous,
        "storage service listening"
    );

    axum::serve(listener, app).await?;
    Ok(())
}
