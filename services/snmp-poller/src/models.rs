use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct Device {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: i64,
    pub version: String,
    pub community: String,
    pub enabled: bool,
    pub created_at: i64,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct Target {
    pub id: String,
    pub device_id: String,
    pub name: String,
    pub oid: String,
    pub poll_interval: Option<i64>,
    pub enabled: bool,
    pub created_at: i64,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct Sample {
    pub id: String,
    pub target_id: String,
    pub ts: i64,
    pub counter: i64,
    pub rate: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct CreateDeviceRequest {
    pub name: String,
    pub host: String,
    pub port: Option<i64>,
    pub version: Option<String>,
    pub community: Option<String>,
    pub enabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTargetRequest {
    pub name: String,
    pub oid: String,
    pub poll_interval: Option<i64>,
    pub enabled: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct Stats {
    pub total_devices: i64,
    pub enabled_devices: i64,
    pub total_targets: i64,
    pub total_samples: i64,
}
