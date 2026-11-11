use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct User {
    pub id: String,
    pub username: String,
    #[serde(skip_serializing)]
    pub password: String,
    pub enabled: bool,
    pub framed_ip: Option<String>,
    pub vlan_id: Option<i64>,
    pub session_timeout: Option<i64>,
    pub mac_address: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct RadiusLog {
    pub id: String,
    pub username: String,
    pub nas_ip: Option<String>,
    pub nas_port: Option<String>,
    pub event: String,
    pub result: String,
    pub framed_ip: Option<String>,
    pub vlan_id: Option<i64>,
    pub created_at: i64,
}

#[derive(Debug, Serialize)]
pub struct Stats {
    pub total_users: i64,
    pub enabled_users: i64,
    pub total_logins: i64,
    pub recent_rejects: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateUserRequest {
    pub username: String,
    pub password: String,
    pub enabled: Option<bool>,
    pub framed_ip: Option<String>,
    pub vlan_id: Option<i64>,
    pub session_timeout: Option<i64>,
    pub mac_address: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserRequest {
    pub password: Option<String>,
    pub enabled: Option<bool>,
    pub framed_ip: Option<String>,
    pub vlan_id: Option<i64>,
    pub session_timeout: Option<i64>,
    pub mac_address: Option<String>,
}