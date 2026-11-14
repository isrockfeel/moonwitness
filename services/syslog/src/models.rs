use serde::Serialize;
use sqlx::FromRow;

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct SyslogMessage {
    pub id: String,
    pub received_at: i64,
    pub source_ip: Option<String>,
    pub transport: String,
    pub facility: Option<i64>,
    pub severity: Option<i64>,
    pub priority: Option<i64>,
    pub timestamp: Option<String>,
    pub hostname: Option<String>,
    pub app_name: Option<String>,
    pub procid: Option<String>,
    pub msgid: Option<String>,
    pub message: String,
    pub raw: String,
}

#[derive(Debug, Serialize)]
pub struct Stats {
    pub total_messages: i64,
    pub by_severity: Vec<SeverityCount>,
    pub recent_sources: Vec<String>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct SeverityCount {
    pub severity: Option<i64>,
    pub count: i64,
}
