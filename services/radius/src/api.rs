use axum::{
    extract::{Path, Query, State},
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use serde_json::json;

use crate::db::Pool;
use crate::error::AppError;
use crate::models::{CreateUserRequest, RadiusLog, Stats, UpdateUserRequest, User};

#[derive(Clone)]
pub struct AppState {
    pub pool: Pool,
}

pub fn router(pool: Pool) -> Router {
    let state = AppState { pool };
    Router::new()
        .route("/health", get(health))
        .route("/api/users", get(list_users).post(create_user))
        .route(
            "/api/users/:username",
            get(get_user).put(update_user).delete(delete_user),
        )
        .route("/api/logs", get(list_logs))
        .route("/api/stats", get(stats))
        .with_state(state)
}

async fn health() -> Json<serde_json::Value> {
    Json(json!({ "status": "ok", "service": "radius" }))
}

async fn list_users(State(state): State<AppState>) -> Result<Json<Vec<User>>, AppError> {
    let users = sqlx::query_as::<_, User>(
        "SELECT id, username, password, enabled, framed_ip, vlan_id, session_timeout, mac_address \
         FROM users ORDER BY username",
    )
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(users))
}

async fn get_user(
    State(state): State<AppState>,
    Path(username): Path<String>,
) -> Result<Json<User>, AppError> {
    let user = fetch_user(&state.pool, &username)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("user '{username}' not found")))?;
    Ok(Json(user))
}

async fn create_user(
    State(state): State<AppState>,
    Json(req): Json<CreateUserRequest>,
) -> Result<(axum::http::StatusCode, Json<User>), AppError> {
    if req.username.trim().is_empty() || req.password.is_empty() {
        return Err(AppError::BadRequest(
            "username and password are required".to_string(),
        ));
    }

    if fetch_user(&state.pool, &req.username).await?.is_some() {
        return Err(AppError::Conflict(format!(
            "user '{}' already exists",
            req.username
        )));
    }

    let id = uuid::Uuid::new_v4().to_string();
    let password_hash = hash_password_blocking(req.password.clone()).await?;
    sqlx::query(
        "INSERT INTO users (id, username, password, enabled, framed_ip, vlan_id, session_timeout, mac_address) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&req.username)
    .bind(&password_hash)
    .bind(req.enabled.unwrap_or(true))
    .bind(&req.framed_ip)
    .bind(req.vlan_id)
    .bind(req.session_timeout)
    .bind(&req.mac_address)
    .execute(&state.pool)
    .await?;

    let user = fetch_user(&state.pool, &req.username)
        .await?
        .ok_or_else(|| AppError::Internal(anyhow::anyhow!("created user vanished")))?;
    Ok((axum::http::StatusCode::CREATED, Json(user)))
}

async fn update_user(
    State(state): State<AppState>,
    Path(username): Path<String>,
    Json(req): Json<UpdateUserRequest>,
) -> Result<Json<User>, AppError> {
    let existing = fetch_user(&state.pool, &username)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("user '{username}' not found")))?;

    let password_hash = match req.password {
        Some(plain) => hash_password_blocking(plain).await?,
        None => existing.password,
    };

    sqlx::query(
        "UPDATE users SET password = ?, enabled = ?, framed_ip = ?, vlan_id = ?, \
         session_timeout = ?, mac_address = ? WHERE username = ?",
    )
    .bind(password_hash)
    .bind(req.enabled.unwrap_or(existing.enabled))
    .bind(req.framed_ip.or(existing.framed_ip))
    .bind(req.vlan_id.or(existing.vlan_id))
    .bind(req.session_timeout.or(existing.session_timeout))
    .bind(req.mac_address.or(existing.mac_address))
    .bind(&username)
    .execute(&state.pool)
    .await?;

    let user = fetch_user(&state.pool, &username)
        .await?
        .ok_or_else(|| AppError::Internal(anyhow::anyhow!("updated user vanished")))?;
    Ok(Json(user))
}

async fn delete_user(
    State(state): State<AppState>,
    Path(username): Path<String>,
) -> Result<axum::http::StatusCode, AppError> {
    let result = sqlx::query("DELETE FROM users WHERE username = ?")
        .bind(&username)
        .execute(&state.pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("user '{username}' not found")));
    }
    Ok(axum::http::StatusCode::NO_CONTENT)
}

#[derive(Deserialize)]
struct LogQuery {
    limit: Option<i64>,
    username: Option<String>,
}

async fn list_logs(
    State(state): State<AppState>,
    Query(q): Query<LogQuery>,
) -> Result<Json<Vec<RadiusLog>>, AppError> {
    let limit = q.limit.unwrap_or(100).clamp(1, 1000);

    let logs = match q.username {
        Some(username) => {
            sqlx::query_as::<_, RadiusLog>(
                "SELECT id, username, nas_ip, nas_port, event, result, framed_ip, vlan_id, created_at \
                 FROM radius_logs WHERE username = ? ORDER BY created_at DESC LIMIT ?",
            )
            .bind(username)
            .bind(limit)
            .fetch_all(&state.pool)
            .await?
        }
        None => {
            sqlx::query_as::<_, RadiusLog>(
                "SELECT id, username, nas_ip, nas_port, event, result, framed_ip, vlan_id, created_at \
                 FROM radius_logs ORDER BY created_at DESC LIMIT ?",
            )
            .bind(limit)
            .fetch_all(&state.pool)
            .await?
        }
    };

    Ok(Json(logs))
}

async fn stats(State(state): State<AppState>) -> Result<Json<Stats>, AppError> {
    let total_users: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users")
        .fetch_one(&state.pool)
        .await?;
    let enabled_users: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users WHERE enabled = 1")
        .fetch_one(&state.pool)
        .await?;
    let total_logins: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM radius_logs WHERE result = 'accept'")
            .fetch_one(&state.pool)
            .await?;
    let cutoff = chrono::Utc::now().timestamp() - 86_400;
    let recent_rejects: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM radius_logs WHERE result LIKE 'reject%' AND created_at >= ?")
            .bind(cutoff)
            .fetch_one(&state.pool)
            .await?;

    Ok(Json(Stats {
        total_users,
        enabled_users,
        total_logins,
        recent_rejects,
    }))
}

async fn fetch_user(pool: &Pool, username: &str) -> Result<Option<User>, AppError> {
    let user = sqlx::query_as::<_, User>(
        "SELECT id, username, password, enabled, framed_ip, vlan_id, session_timeout, mac_address \
         FROM users WHERE username = ?",
    )
    .bind(username)
    .fetch_optional(pool)
    .await?;
    Ok(user)
}

async fn hash_password_blocking(password: String) -> Result<String, AppError> {
    tokio::task::spawn_blocking(move || crate::radius::auth::hash_password(&password))
        .await
        .map_err(|e| AppError::Internal(anyhow::Error::new(e)))?
        .map_err(AppError::Internal)
}