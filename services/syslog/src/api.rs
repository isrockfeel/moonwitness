use axum::{
    extract::{Path, Query, State},
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use serde_json::json;

use crate::db::Pool;
use crate::error::AppError;
use crate::models::{SeverityCount, Stats, SyslogMessage};

#[derive(Clone)]
pub struct AppState {
    pub pool: Pool,
}

pub fn router(pool: Pool) -> Router {
    let state = AppState { pool };
    Router::new()
        .route("/health", get(health))
        .route("/api/messages", get(list_messages))
        .route("/api/messages/:id", get(get_message))
        .route("/api/stats", get(stats))
        .with_state(state)
}

async fn health() -> Json<serde_json::Value> {
    Json(json!({ "status": "ok", "service": "syslog" }))
}

#[derive(Deserialize)]
struct LogQuery {
    limit: Option<i64>,
    severity: Option<i64>,
    hostname: Option<String>,
    app_name: Option<String>,
    q: Option<String>,
}

async fn list_messages(
    State(state): State<AppState>,
    Query(q): Query<LogQuery>,
) -> Result<Json<Vec<SyslogMessage>>, AppError> {
    let limit = q.limit.unwrap_or(100).clamp(1, 1000);

    // Simple filtered query; for complex combinations we build incrementally.
    let messages = if let Some(sev) = q.severity {
        sqlx::query_as::<_, SyslogMessage>(
            "SELECT id, received_at, source_ip, transport, facility, severity, priority, timestamp, \
             hostname, app_name, procid, msgid, message, raw \
             FROM syslog_messages WHERE severity = ? ORDER BY received_at DESC LIMIT ?",
        )
        .bind(sev)
        .bind(limit)
        .fetch_all(&state.pool)
        .await?
    } else if let Some(ref host) = q.hostname {
        sqlx::query_as::<_, SyslogMessage>(
            "SELECT id, received_at, source_ip, transport, facility, severity, priority, timestamp, \
             hostname, app_name, procid, msgid, message, raw \
             FROM syslog_messages WHERE hostname = ? ORDER BY received_at DESC LIMIT ?",
        )
        .bind(host)
        .bind(limit)
        .fetch_all(&state.pool)
        .await?
    } else if let Some(ref app) = q.app_name {
        sqlx::query_as::<_, SyslogMessage>(
            "SELECT id, received_at, source_ip, transport, facility, severity, priority, timestamp, \
             hostname, app_name, procid, msgid, message, raw \
             FROM syslog_messages WHERE app_name = ? ORDER BY received_at DESC LIMIT ?",
        )
        .bind(app)
        .bind(limit)
        .fetch_all(&state.pool)
        .await?
    } else if let Some(ref term) = q.q {
        let like = format!("%{}%", term);
        sqlx::query_as::<_, SyslogMessage>(
            "SELECT id, received_at, source_ip, transport, facility, severity, priority, timestamp, \
             hostname, app_name, procid, msgid, message, raw \
             FROM syslog_messages WHERE message LIKE ? OR raw LIKE ? ORDER BY received_at DESC LIMIT ?",
        )
        .bind(&like)
        .bind(&like)
        .bind(limit)
        .fetch_all(&state.pool)
        .await?
    } else {
        sqlx::query_as::<_, SyslogMessage>(
            "SELECT id, received_at, source_ip, transport, facility, severity, priority, timestamp, \
             hostname, app_name, procid, msgid, message, raw \
             FROM syslog_messages ORDER BY received_at DESC LIMIT ?",
        )
        .bind(limit)
        .fetch_all(&state.pool)
        .await?
    };

    Ok(Json(messages))
}

async fn get_message(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<SyslogMessage>, AppError> {
    let msg = sqlx::query_as::<_, SyslogMessage>(
        "SELECT id, received_at, source_ip, transport, facility, severity, priority, timestamp, \
         hostname, app_name, procid, msgid, message, raw \
         FROM syslog_messages WHERE id = ?",
    )
    .bind(&id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("message '{id}' not found")))?;
    Ok(Json(msg))
}

async fn stats(State(state): State<AppState>) -> Result<Json<Stats>, AppError> {
    let total_messages: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM syslog_messages")
        .fetch_one(&state.pool)
        .await?;

    let by_severity = sqlx::query_as::<_, SeverityCount>(
        "SELECT severity, COUNT(*) as count FROM syslog_messages \
         GROUP BY severity ORDER BY severity",
    )
    .fetch_all(&state.pool)
    .await?;

    let recent_sources: Vec<String> = sqlx::query_scalar(
        "SELECT DISTINCT source_ip FROM syslog_messages \
         WHERE source_ip IS NOT NULL ORDER BY received_at DESC LIMIT 20",
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(Stats {
        total_messages,
        by_severity,
        recent_sources,
    }))
}
