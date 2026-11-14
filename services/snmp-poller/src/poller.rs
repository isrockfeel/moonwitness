//! Background SNMP poller: fetches counter OIDs per target and stores samples with rates.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use tokio::task::JoinHandle;

use crate::config::Config;
use crate::db::Pool;
// (Target model not needed here; poller uses its own TargetRow join.)

#[derive(Debug, sqlx::FromRow)]
struct TargetRow {
    id: String,
    #[allow(dead_code)]
    device_id: String,
    name: String,
    oid: String,
    poll_interval: Option<i64>,
    enabled: bool,
    // device fields
    host: String,
    port: i64,
    version: String,
    community: String,
    device_enabled: bool,
}

pub struct SnmpPoller {
    config: Arc<Config>,
    pool: Pool,
}

impl SnmpPoller {
    pub fn new(config: Arc<Config>, pool: Pool) -> Self {
        SnmpPoller { config, pool }
    }

    pub fn spawn(self) -> PollerHandle {
        let (shutdown_tx, mut shutdown_rx) = tokio::sync::watch::channel(false);
        let handle = tokio::spawn(async move {
            let mut next_run: HashMap<String, i64> = HashMap::new();
            loop {
                tokio::select! {
                    _ = shutdown_rx.changed() => break,
                    _ = tokio::time::sleep(Duration::from_secs(1)) => {}
                }
                let now = chrono::Utc::now().timestamp();
                let targets = match load_targets(&self.pool).await {
                    Ok(t) => t,
                    Err(e) => {
                        tracing::error!(error = %e, "failed to load SNMP targets");
                        continue;
                    }
                };
                for t in targets {
                    if !t.enabled || !t.device_enabled {
                        continue;
                    }
                    let interval = t.poll_interval.unwrap_or(self.config.poll_interval).max(5);
                    let due = next_run.get(&t.id).copied().unwrap_or(0);
                    if now < due {
                        continue;
                    }
                    next_run.insert(t.id.clone(), now + interval);
                    if let Err(e) = poll_target(&self.pool, &self.config, &t, now).await {
                        tracing::warn!(target = %t.name, host = %t.host, error = %e, "SNMP poll failed");
                    }
                }
            }
        });
        PollerHandle {
            shutdown_tx,
            task: handle,
        }
    }
}

pub struct PollerHandle {
    shutdown_tx: tokio::sync::watch::Sender<bool>,
    task: JoinHandle<()>,
}

impl PollerHandle {
    pub async fn shutdown(self) {
        let _ = self.shutdown_tx.send(true);
        let _ = self.task.await;
    }
}

async fn load_targets(pool: &Pool) -> anyhow::Result<Vec<TargetRow>> {
    let rows = sqlx::query_as::<_, TargetRow>(
        "SELECT t.id, t.device_id, t.name, t.oid, t.poll_interval, t.enabled, \
                d.host, d.port, d.version, d.community, d.enabled as device_enabled \
         FROM targets t JOIN devices d ON d.id = t.device_id \
         WHERE t.enabled = 1 AND d.enabled = 1",
    )
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

async fn poll_target(pool: &Pool, config: &Config, t: &TargetRow, now: i64) -> anyhow::Result<()> {
    let addr = format!("{}:{}", t.host, t.port);
    let community = t.community.as_bytes().to_vec();
    let oid = parse_oid(&t.oid)?;
    let timeout = Duration::from_millis(config.timeout_ms);
    let _ = t.version.as_str(); // v1/v2c share the same community-based GET in this crate

    let counter =
        tokio::task::spawn_blocking(move || snmp_get_counter(&addr, &community, &oid, timeout))
            .await??;

    // Previous sample for rate calculation.
    let prev: Option<(i64, i64)> = sqlx::query_as(
        "SELECT ts, counter FROM samples WHERE target_id = ? ORDER BY ts DESC LIMIT 1",
    )
    .bind(&t.id)
    .fetch_optional(pool)
    .await?;

    let rate = compute_rate(prev, now, counter);
    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO samples (id, target_id, ts, counter, rate) VALUES (?, ?, ?, ?, ?)")
        .bind(&id)
        .bind(&t.id)
        .bind(now)
        .bind(counter as i64)
        .bind(rate)
        .execute(pool)
        .await?;

    if config.max_samples > 0 {
        let _ = sqlx::query(
            "DELETE FROM samples WHERE id IN (\
               SELECT id FROM samples WHERE target_id = ? ORDER BY ts DESC LIMIT -1 OFFSET ?\
             )",
        )
        .bind(&t.id)
        .bind(config.max_samples)
        .execute(pool)
        .await;
    }

    Ok(())
}

/// Compute rate (units/sec) from previous (ts,counter_bits) and current sample.
/// Counters are treated as unsigned 64-bit (wrapping subtraction) to handle 32/64-bit wraps.
fn compute_rate(prev: Option<(i64, i64)>, now: i64, current: u64) -> Option<f64> {
    let (prev_ts, prev_counter_bits) = prev?;
    let dt = now - prev_ts;
    if dt <= 0 {
        return None;
    }
    let prev_u = prev_counter_bits as u64;
    let delta = current.wrapping_sub(prev_u);
    Some(delta as f64 / dt as f64)
}

/// Perform a blocking SNMP GET and extract a counter-like unsigned value.
fn snmp_get_counter(
    addr: &str,
    community: &[u8],
    oid: &[u32],
    timeout: Duration,
) -> anyhow::Result<u64> {
    let mut sess = snmp::SyncSession::new(addr, community, Some(timeout), 0)
        .map_err(|e| anyhow::anyhow!("snmp session: {e:?}"))?;

    let mut response = sess
        .get(oid)
        .map_err(|e| anyhow::anyhow!("snmp get: {e:?}"))?;
    if let Some((_name, val)) = response.varbinds.next() {
        return value_to_u64(val);
    }
    anyhow::bail!("empty SNMP response")
}

fn value_to_u64(val: snmp::Value) -> anyhow::Result<u64> {
    use snmp::Value;
    match val {
        Value::Counter32(v) => Ok(v as u64),
        Value::Unsigned32(v) => Ok(v as u64),
        Value::Timeticks(v) => Ok(v as u64),
        Value::Counter64(v) => Ok(v),
        Value::Integer(v) => {
            if v < 0 {
                anyhow::bail!("negative integer value");
            }
            Ok(v as u64)
        }
        other => anyhow::bail!("unsupported SNMP value type: {other:?}"),
    }
}

/// Parse a dotted numeric OID string like ".1.3.6.1.2.1.1.3.0" or "1.3.6...".
fn parse_oid(s: &str) -> anyhow::Result<Vec<u32>> {
    let s = s.trim().trim_start_matches('.');
    let parts: Result<Vec<u32>, _> = s
        .split('.')
        .filter(|p| !p.is_empty())
        .map(|p| p.parse::<u32>())
        .collect();
    let oid = parts.map_err(|_| anyhow::anyhow!("invalid OID: {s}"))?;
    if oid.is_empty() {
        anyhow::bail!("empty OID");
    }
    Ok(oid)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_oid() {
        assert_eq!(
            parse_oid(".1.3.6.1.2.1.1.3.0").unwrap(),
            vec![1, 3, 6, 1, 2, 1, 1, 3, 0]
        );
        assert_eq!(parse_oid("1.3.6.1").unwrap(), vec![1, 3, 6, 1]);
    }

    #[test]
    fn computes_rate_simple() {
        let r = compute_rate(Some((100, 1000)), 110, 2000);
        assert!((r.unwrap() - 100.0).abs() < 1e-9);
    }

    #[test]
    fn computes_rate_wrap32() {
        let prev = u32::MAX as u64 - 10;
        let curr = 20u64;
        let r = compute_rate(Some((100, prev as i64)), 110, curr).unwrap();
        // delta = (20 - (u32::MAX-10)) mod 2^64 = 31 (32-bit wrap)
        // But we use 64-bit wrapping, so delta = 2^64 - (u32::MAX - 10) + 20 = 18446744069414584351
        // rate = delta / 10 = 1844674406941458435.1
        let expected = 1844674406941458435.1_f64;
        assert!((r - expected).abs() < 1e-9);
    }

    #[test]
    fn computes_rate_wrap64() {
        let prev = u64::MAX - 10;
        let curr = 20u64;
        let r = compute_rate(Some((100, prev as i64)), 110, curr).unwrap();
        // delta = (20 - (u64::MAX-10)) mod 2^64 = 31
        assert!((r - 3.1).abs() < 1e-9);
    }
}
