mod api;
mod config;
mod db;
mod error;
mod models;
mod poller;

use std::sync::Arc;

use axum::Router;
use tower::ServiceBuilder;
use tower_http::{cors::CorsLayer, trace::TraceLayer};

use crate::config::Config;
use crate::db::init_db;
use crate::poller::SnmpPoller;

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

    let poller = SnmpPoller::new(state.clone(), pool.clone());
    let poller_handle = poller.spawn();

    let app = Router::new().merge(api::router(pool.clone())).layer(
        ServiceBuilder::new()
            .layer(TraceLayer::new_for_http())
            .layer(CorsLayer::permissive()),
    );

    let listener =
        tokio::net::TcpListener::bind(format!("{}:{}", config.host, config.http_port)).await?;
    tracing::info!(
        host = %config.host,
        http_port = config.http_port,
        poll_interval = config.poll_interval,
        "snmp-poller service listening"
    );

    axum::serve(listener, app).await?;

    poller_handle.shutdown().await;
    Ok(())
}
