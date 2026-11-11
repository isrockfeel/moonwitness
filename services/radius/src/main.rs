mod api;
mod config;
mod db;
mod error;
mod models;
mod radius;

use std::sync::Arc;

use axum::Router;
use tower::ServiceBuilder;
use tower_http::{cors::CorsLayer, trace::TraceLayer};

use crate::config::Config;
use crate::db::init_db;
use crate::radius::server::RadiusServer;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    let config = Config::from_env()?;
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .json()
        .init();

    let pool = init_db(&config.database_url).await?;
    let state = Arc::new(config.clone());

    // RADIUS UDP server (auth + accounting) runs in the background.
    let radius = RadiusServer::new(state.clone(), pool.clone());
    let radius_handle = radius.spawn();

    // HTTP admin API.
    let app = Router::new()
        .merge(api::router(pool.clone()))
        .layer(
            ServiceBuilder::new()
                .layer(TraceLayer::new_for_http())
                .layer(CorsLayer::permissive()),
        );

    let listener = tokio::net::TcpListener::bind(format!("{}:{}", config.host, config.http_port))
        .await?;
    tracing::info!(
        host = %config.host,
        http_port = config.http_port,
        radius_auth_port = config.radius_auth_port,
        radius_acct_port = config.radius_acct_port,
        "RADIUS service listening"
    );

    axum::serve(listener, app).await?;

    // On shutdown, stop the RADIUS UDP listeners.
    radius_handle.shutdown().await;
    Ok(())
}