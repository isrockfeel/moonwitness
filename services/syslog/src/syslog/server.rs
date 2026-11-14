//! UDP and TCP syslog listeners that ingest messages into SQLite.

use std::sync::Arc;

use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::net::{TcpListener, UdpSocket};
use tokio::task::JoinHandle;

use crate::config::Config;
use crate::db::Pool;
use crate::syslog::parser;

const MAX_UDP_PACKET: usize = 64 * 1024;

pub struct SyslogServer {
    config: Arc<Config>,
    pool: Pool,
}

impl SyslogServer {
    pub fn new(config: Arc<Config>, pool: Pool) -> Self {
        SyslogServer { config, pool }
    }

    pub fn spawn(self) -> SyslogHandle {
        let (shutdown_tx, mut shutdown_rx) = tokio::sync::watch::channel(false);

        let udp_task = {
            let config = self.config.clone();
            let pool = self.pool.clone();
            tokio::spawn(run_udp(config, pool))
        };
        let tcp_task = {
            let config = self.config.clone();
            let pool = self.pool.clone();
            tokio::spawn(run_tcp(config, pool))
        };

        let handle = tokio::spawn(async move {
            let _ = shutdown_rx.changed().await;
            udp_task.abort();
            tcp_task.abort();
        });

        SyslogHandle {
            shutdown_tx,
            task: handle,
        }
    }
}

pub struct SyslogHandle {
    shutdown_tx: tokio::sync::watch::Sender<bool>,
    task: JoinHandle<()>,
}

impl SyslogHandle {
    pub async fn shutdown(self) {
        let _ = self.shutdown_tx.send(true);
        let _ = self.task.await;
    }
}

async fn run_udp(config: Arc<Config>, pool: Pool) {
    let addr = format!("{}:{}", config.host, config.syslog_udp_port);
    let socket = match UdpSocket::bind(&addr).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!(error = %e, %addr, "failed to bind syslog UDP socket");
            return;
        }
    };
    tracing::info!(%addr, "syslog UDP listener started");

    let mut buf = vec![0u8; MAX_UDP_PACKET];
    loop {
        let (n, peer) = match socket.recv_from(&mut buf).await {
            Ok(v) => v,
            Err(e) => {
                tracing::error!(error = %e, "syslog UDP recv error");
                continue;
            }
        };
        let raw = String::from_utf8_lossy(&buf[..n]).to_string();
        if let Err(e) = ingest(&pool, &config, "udp", Some(peer.ip().to_string()), &raw).await {
            tracing::warn!(error = %e, "failed to ingest syslog UDP message");
        }
    }
}

async fn run_tcp(config: Arc<Config>, pool: Pool) {
    let addr = format!("{}:{}", config.host, config.syslog_tcp_port);
    let listener = match TcpListener::bind(&addr).await {
        Ok(l) => l,
        Err(e) => {
            tracing::error!(error = %e, %addr, "failed to bind syslog TCP socket");
            return;
        }
    };
    tracing::info!(%addr, "syslog TCP listener started");

    loop {
        let (stream, peer) = match listener.accept().await {
            Ok(v) => v,
            Err(e) => {
                tracing::error!(error = %e, "syslog TCP accept error");
                continue;
            }
        };
        let pool = pool.clone();
        let config = config.clone();
        tokio::spawn(async move {
            let mut reader = BufReader::new(stream);
            let mut line = String::new();
            loop {
                line.clear();
                match reader.read_line(&mut line).await {
                    Ok(0) => break,
                    Ok(_) => {
                        if let Err(e) =
                            ingest(&pool, &config, "tcp", Some(peer.ip().to_string()), &line).await
                        {
                            tracing::warn!(error = %e, "failed to ingest syslog TCP message");
                        }
                    }
                    Err(e) => {
                        tracing::debug!(error = %e, "syslog TCP read error");
                        break;
                    }
                }
            }
        });
    }
}

async fn ingest(
    pool: &Pool,
    config: &Config,
    transport: &str,
    source_ip: Option<String>,
    raw: &str,
) -> anyhow::Result<()> {
    let parsed = parser::parse(raw);
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp();

    sqlx::query(
        "INSERT INTO syslog_messages \
         (id, received_at, source_ip, transport, facility, severity, priority, timestamp, hostname, app_name, procid, msgid, message, raw) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(now)
    .bind(&source_ip)
    .bind(transport)
    .bind(parsed.facility.map(i64::from))
    .bind(parsed.severity.map(i64::from))
    .bind(parsed.priority.map(i64::from))
    .bind(&parsed.timestamp)
    .bind(&parsed.hostname)
    .bind(&parsed.app_name)
    .bind(&parsed.procid)
    .bind(&parsed.msgid)
    .bind(&parsed.message)
    .bind(raw.trim_end_matches(['\r', '\n']))
    .execute(pool)
    .await?;

    if config.max_messages > 0 {
        // Prune oldest messages beyond retention cap.
        let _ = sqlx::query(
            "DELETE FROM syslog_messages WHERE id IN (\
               SELECT id FROM syslog_messages ORDER BY received_at DESC \
               LIMIT -1 OFFSET ?\
             )",
        )
        .bind(config.max_messages)
        .execute(pool)
        .await;
    }

    Ok(())
}
