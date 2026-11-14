use axum::{
    extract::{Path, Query, State},
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use serde_json::json;

use crate::db::Pool;
use crate::error::AppError;
use crate::models::{CreateDeviceRequest, CreateTargetRequest, Device, Sample, Stats, Target};

#[derive(Clone)]
pub struct AppState {
    pub pool: Pool,
}

pub fn router(pool: Pool) -> Router {
    let state = AppState { pool };
    Router::new()
        .route("/health", get(health))
        .route("/api/devices", get(list_devices).post(create_device))
        .route("/api/devices/:id", get(get_device).delete(delete_device))
        .route(
            "/api/devices/:id/targets",
            get(list_targets).post(create_target),
        )
        .route("/api/targets/:id", get(get_target).delete(delete_target))
        .route("/api/targets/:id/samples", get(list_samples))
        .route("/api/targets/:id/latest", get(latest_sample))
        .route("/api/stats", get(stats))
        .with_state(state)
}

async fn health() -> Json<serde_json::Value> {
    Json(json!({ "status": "ok", "service": "snmp-poller" }))
}

async fn list_devices(State(state): State<AppState>) -> Result<Json<Vec<Device>>, AppError> {
    let devices = sqlx::query_as::<_, Device>(
        "SELECT id, name, host, port, version, community, enabled, created_at FROM devices ORDER BY name",
    )
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(devices))
}

async fn get_device(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Device>, AppError> {
    let device = sqlx::query_as::<_, Device>(
        "SELECT id, name, host, port, version, community, enabled, created_at FROM devices WHERE id = ?",
    )
    .bind(&id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("device '{id}' not found")))?;
    Ok(Json(device))
}

async fn create_device(
    State(state): State<AppState>,
    Json(req): Json<CreateDeviceRequest>,
) -> Result<(axum::http::StatusCode, Json<Device>), AppError> {
    if req.name.trim().is_empty() || req.host.trim().is_empty() {
        return Err(AppError::BadRequest(
            "name and host are required".to_string(),
        ));
    }
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp();
    let port = req.port.unwrap_or(161);
    let version = req.version.unwrap_or_else(|| "2c".to_string());
    if version != "1" && version != "2c" {
        return Err(AppError::BadRequest(
            "version must be '1' or '2c'".to_string(),
        ));
    }
    let community = req.community.unwrap_or_else(|| "public".to_string());
    let enabled = req.enabled.unwrap_or(true);
    sqlx::query(
        "INSERT INTO devices (id, name, host, port, version, community, enabled, created_at) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&req.name)
    .bind(&req.host)
    .bind(port)
    .bind(&version)
    .bind(&community)
    .bind(enabled)
    .bind(now)
    .execute(&state.pool)
    .await?;
    let device = sqlx::query_as::<_, Device>(
        "SELECT id, name, host, port, version, community, enabled, created_at FROM devices WHERE id = ?",
    )
    .bind(&id)
    .fetch_one(&state.pool)
    .await?;
    Ok((axum::http::StatusCode::CREATED, Json(device)))
}

async fn delete_device(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<axum::http::StatusCode, AppError> {
    let result = sqlx::query("DELETE FROM devices WHERE id = ?")
        .bind(&id)
        .execute(&state.pool)
        .await?;
    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("device '{id}' not found")));
    }
    Ok(axum::http::StatusCode::NO_CONTENT)
}

async fn list_targets(
    State(state): State<AppState>,
    Path(device_id): Path<String>,
) -> Result<Json<Vec<Target>>, AppError> {
    let targets = sqlx::query_as::<_, Target>(
        "SELECT id, device_id, name, oid, poll_interval, enabled, created_at \
         FROM targets WHERE device_id = ? ORDER BY name",
    )
    .bind(&device_id)
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(targets))
}

async fn get_target(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Target>, AppError> {
    let target = sqlx::query_as::<_, Target>(
        "SELECT id, device_id, name, oid, poll_interval, enabled, created_at \
         FROM targets WHERE id = ?",
    )
    .bind(&id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("target '{id}' not found")))?;
    Ok(Json(target))
}

async fn create_target(
    State(state): State<AppState>,
    Path(device_id): Path<String>,
    Json(req): Json<CreateTargetRequest>,
) -> Result<(axum::http::StatusCode, Json<Target>), AppError> {
    if req.name.trim().is_empty() || req.oid.trim().is_empty() {
        return Err(AppError::BadRequest(
            "name and oid are required".to_string(),
        ));
    }
    // ensure device exists
    let exists: Option<(String,)> = sqlx::query_as("SELECT id FROM devices WHERE id = ?")
        .bind(&device_id)
        .fetch_optional(&state.pool)
        .await?;
    if exists.is_none() {
        return Err(AppError::NotFound(format!(
            "device '{device_id}' not found"
        )));
    }
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp();
    sqlx::query(
        "INSERT INTO targets (id, device_id, name, oid, poll_interval, enabled, created_at) \
         VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&device_id)
    .bind(&req.name)
    .bind(&req.oid)
    .bind(req.poll_interval)
    .bind(req.enabled.unwrap_or(true))
    .bind(now)
    .execute(&state.pool)
    .await?;
    let target = sqlx::query_as::<_, Target>(
        "SELECT id, device_id, name, oid, poll_interval, enabled, created_at FROM targets WHERE id = ?",
    )
    .bind(&id)
    .fetch_one(&state.pool)
    .await?;
    Ok((axum::http::StatusCode::CREATED, Json(target)))
}

async fn delete_target(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<axum::http::StatusCode, AppError> {
    let result = sqlx::query("DELETE FROM targets WHERE id = ?")
        .bind(&id)
        .execute(&state.pool)
        .await?;
    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("target '{id}' not found")));
    }
    Ok(axum::http::StatusCode::NO_CONTENT)
}

#[derive(Deserialize)]
struct SampleQuery {
    from: Option<i64>,
    to: Option<i64>,
    limit: Option<i64>,
}

async fn list_samples(
    State(state): State<AppState>,
    Path(target_id): Path<String>,
    Query(q): Query<SampleQuery>,
) -> Result<Json<Vec<Sample>>, AppError> {
    let limit = q.limit.unwrap_or(500).clamp(1, 10_000);
    let samples = match (q.from, q.to) {
        (Some(from), Some(to)) => {
            sqlx::query_as::<_, Sample>(
                "SELECT id, target_id, ts, counter, rate FROM samples \
                 WHERE target_id = ? AND ts >= ? AND ts <= ? ORDER BY ts ASC LIMIT ?",
            )
            .bind(&target_id)
            .bind(from)
            .bind(to)
            .bind(limit)
            .fetch_all(&state.pool)
            .await?
        }
        (Some(from), None) => {
            sqlx::query_as::<_, Sample>(
                "SELECT id, target_id, ts, counter, rate FROM samples \
                 WHERE target_id = ? AND ts >= ? ORDER BY ts ASC LIMIT ?",
            )
            .bind(&target_id)
            .bind(from)
            .bind(limit)
            .fetch_all(&state.pool)
            .await?
        }
        _ => {
            sqlx::query_as::<_, Sample>(
                "SELECT id, target_id, ts, counter, rate FROM samples \
                 WHERE target_id = ? ORDER BY ts DESC LIMIT ?",
            )
            .bind(&target_id)
            .bind(limit)
            .fetch_all(&state.pool)
            .await?
        }
    };
    Ok(Json(samples))
}

async fn latest_sample(
    State(state): State<AppState>,
    Path(target_id): Path<String>,
) -> Result<Json<Sample>, AppError> {
    let sample = sqlx::query_as::<_, Sample>(
        "SELECT id, target_id, ts, counter, rate FROM samples \
         WHERE target_id = ? ORDER BY ts DESC LIMIT 1",
    )
    .bind(&target_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("no samples for target '{target_id}'")))?;
    Ok(Json(sample))
}

async fn stats(State(state): State<AppState>) -> Result<Json<Stats>, AppError> {
    let total_devices: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM devices")
        .fetch_one(&state.pool)
        .await?;
    let enabled_devices: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM devices WHERE enabled = 1")
        .fetch_one(&state.pool)
        .await?;
    let total_targets: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM targets")
        .fetch_one(&state.pool)
        .await?;
    let total_samples: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM samples")
        .fetch_one(&state.pool)
        .await?;
    Ok(Json(Stats {
        total_devices,
        enabled_devices,
        total_targets,
        total_samples,
    }))
}
