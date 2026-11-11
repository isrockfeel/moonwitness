//! UDP RADIUS listeners for authentication (1812) and accounting (1813).

use std::net::SocketAddr;
use std::sync::Arc;

use tokio::net::UdpSocket;
use tokio::task::JoinHandle;

use crate::config::Config;
use crate::db::Pool;
use crate::models::User;
use crate::radius::attributes::{self, Attribute};
use crate::radius::auth;
use crate::radius::packet::{
    RadiusPacket, CODE_ACCESS_ACCEPT, CODE_ACCESS_REJECT, CODE_ACCESS_REQUEST,
    CODE_ACCOUNTING_REQUEST, CODE_ACCOUNTING_RESPONSE,
};

const MAX_PACKET: usize = 4096;

pub struct RadiusServer {
    config: Arc<Config>,
    pool: Pool,
}

impl RadiusServer {
    pub fn new(config: Arc<Config>, pool: Pool) -> Self {
        RadiusServer { config, pool }
    }

    /// Spawn both UDP listeners. Returns a handle for shutdown.
    pub fn spawn(self) -> RadiusHandle {
        let (shutdown_tx, mut shutdown_rx) = tokio::sync::watch::channel(false);

        let auth_task = {
            let config = self.config.clone();
            let pool = self.pool.clone();
            let addr = format!("{}:{}", config.host, config.radius_auth_port);
            tokio::spawn(run_loop(addr, config, pool, Role::Auth))
        };
        let acct_task = {
            let config = self.config.clone();
            let pool = self.pool.clone();
            let addr = format!("{}:{}", config.host, config.radius_acct_port);
            tokio::spawn(run_loop(addr, config, pool, Role::Accounting))
        };

        let handle = tokio::spawn(async move {
            let _ = shutdown_rx.changed().await;
            auth_task.abort();
            acct_task.abort();
        });

        RadiusHandle {
            shutdown_tx,
            task: handle,
        }
    }
}

pub struct RadiusHandle {
    shutdown_tx: tokio::sync::watch::Sender<bool>,
    task: JoinHandle<()>,
}

impl RadiusHandle {
    pub async fn shutdown(self) {
        let _ = self.shutdown_tx.send(true);
        let _ = self.task.await;
    }
}

#[derive(Clone, Copy)]
enum Role {
    Auth,
    Accounting,
}

async fn run_loop(addr: String, config: Arc<Config>, pool: Pool, role: Role) {
    let socket = match UdpSocket::bind(&addr).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!(error = %e, %addr, "failed to bind RADIUS socket");
            return;
        }
    };
    tracing::info!(%addr, "RADIUS listener started");

    let mut buf = vec![0u8; MAX_PACKET];
    loop {
        let (n, peer) = match socket.recv_from(&mut buf).await {
            Ok(v) => v,
            Err(e) => {
                tracing::error!(error = %e, "RADIUS recv error");
                continue;
            }
        };
        if let Some(response) = handle_datagram(&buf[..n], peer, &config, &pool, role).await {
            if let Err(e) = socket.send_to(&response, peer).await {
                tracing::error!(error = %e, %peer, "RADIUS send error");
            }
        }
    }
}

async fn handle_datagram(
    data: &[u8],
    peer: SocketAddr,
    config: &Config,
    pool: &Pool,
    role: Role,
) -> Option<Vec<u8>> {
    let packet = RadiusPacket::decode(data)?;
    match (role, packet.code) {
        (Role::Auth, CODE_ACCESS_REQUEST) => Some(handle_access_request(packet, peer, config, pool).await),
        (Role::Accounting, CODE_ACCOUNTING_REQUEST) => {
            if !packet.verify_accounting_request(data, &config.radius_secret) {
                tracing::warn!(%peer, "accounting request with bad authenticator, dropping");
                return None;
            }
            Some(handle_accounting(packet, peer, config, pool).await)
        }
        (_, other) => {
            tracing::warn!(code = other, %peer, "unexpected RADIUS code");
            None
        }
    }
}

async fn handle_access_request(
    request: RadiusPacket,
    peer: SocketAddr,
    config: &Config,
    pool: &Pool,
) -> Vec<u8> {
    let username = attributes::attr_string(&request.attributes, attributes::USER_NAME)
        .unwrap_or_default();
    let nas_ip = peer.ip().to_string();

    match authenticate(&request, &username, config, pool).await {
        Some(user) => {
            let mut attrs = Vec::new();
            if let Some(ip) = &user.framed_ip {
                if let Ok(addr) = ip.parse::<std::net::Ipv4Addr>() {
                    attrs.push(Attribute::new(
                        attributes::FRAMED_IP_ADDRESS,
                        &addr.octets(),
                    ));
                }
            }
            if let Some(vlan) = user.vlan_id {
                attrs.extend(attributes::vlan_attributes(vlan as u16));
            }
            if let Some(timeout) = user.session_timeout {
                attrs.push(Attribute::new(
                    attributes::SESSION_TIMEOUT,
                    &(timeout as u32).to_be_bytes(),
                ));
            }
            record_log(pool, &username, &nas_ip, "access", "accept", &user).await;
            RadiusPacket {
                code: CODE_ACCESS_ACCEPT,
                identifier: request.identifier,
                authenticator: [0u8; 16],
                attributes: attrs,
            }
            .encode(Some(&request.authenticator), &config.radius_secret)
        }
        None => {
            let reason = if username.is_empty() {
                "missing username"
            } else {
                "invalid credentials or disabled"
            };
            let attrs = vec![Attribute::new(
                attributes::ERROR_MESSAGE,
                reason.as_bytes(),
            )];
            record_log_reject(pool, &username, &nas_ip, reason).await;
            RadiusPacket {
                code: CODE_ACCESS_REJECT,
                identifier: request.identifier,
                authenticator: [0u8; 16],
                attributes: attrs,
            }
            .encode(Some(&request.authenticator), &config.radius_secret)
        }
    }
}

async fn authenticate(
    request: &RadiusPacket,
    username: &str,
    config: &Config,
    pool: &Pool,
) -> Option<User> {
    if username.is_empty() {
        return None;
    }

    let user = sqlx::query_as::<_, User>(
        "SELECT id, username, password, enabled, framed_ip, vlan_id, session_timeout, mac_address \
         FROM users WHERE username = ?",
    )
    .bind(username)
    .fetch_optional(pool)
    .await
    .ok()??;

    if !user.enabled {
        return None;
    }

    let encrypted = attributes::attr_bytes(&request.attributes, attributes::USER_PASSWORD)?;
    let supplied =
        auth::decrypt_user_password(encrypted, &config.radius_secret, &request.authenticator)?;

    let hash = user.password.clone();
    let ok = tokio::task::spawn_blocking(move || auth::verify_password(&hash, &supplied))
        .await
        .unwrap_or(false);

    ok.then_some(user)
}

async fn handle_accounting(
    request: RadiusPacket,
    peer: SocketAddr,
    config: &Config,
    pool: &Pool,
) -> Vec<u8> {
    let username = attributes::attr_string(&request.attributes, attributes::USER_NAME)
        .unwrap_or_default();
    let status = attributes::attr_u32(&request.attributes, attributes::ACCT_STATUS_TYPE)
        .map(|s| match s {
            1 => "start",
            2 => "stop",
            3 => "interim-update",
            _ => "accounting",
        })
        .unwrap_or("accounting");
    let nas_ip = peer.ip().to_string();

    record_log_accounting(pool, &username, &nas_ip, status).await;

    RadiusPacket {
        code: CODE_ACCOUNTING_RESPONSE,
        identifier: request.identifier,
        authenticator: [0u8; 16],
        attributes: Vec::new(),
    }
    .encode(Some(&request.authenticator), &config.radius_secret)
}

async fn record_log(
    pool: &Pool,
    username: &str,
    nas_ip: &str,
    event: &str,
    result: &str,
    user: &User,
) {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp();
    let _ = sqlx::query(
        "INSERT INTO radius_logs (id, username, nas_ip, nas_port, event, result, framed_ip, vlan_id, created_at) \
         VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(username)
    .bind(nas_ip)
    .bind(event)
    .bind(result)
    .bind(&user.framed_ip)
    .bind(user.vlan_id)
    .bind(now)
    .execute(pool)
    .await;
}

async fn record_log_reject(pool: &Pool, username: &str, nas_ip: &str, reason: &str) {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp();
    let _ = sqlx::query(
        "INSERT INTO radius_logs (id, username, nas_ip, nas_port, event, result, framed_ip, vlan_id, created_at) \
         VALUES (?, ?, ?, NULL, 'access', ?, NULL, NULL, ?)",
    )
    .bind(&id)
    .bind(username)
    .bind(nas_ip)
    .bind(format!("reject: {reason}"))
    .bind(now)
    .execute(pool)
    .await;
}

async fn record_log_accounting(pool: &Pool, username: &str, nas_ip: &str, status: &str) {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp();
    let _ = sqlx::query(
        "INSERT INTO radius_logs (id, username, nas_ip, nas_port, event, result, framed_ip, vlan_id, created_at) \
         VALUES (?, ?, ?, NULL, ?, 'recorded', NULL, NULL, ?)",
    )
    .bind(&id)
    .bind(username)
    .bind(nas_ip)
    .bind(status)
    .bind(now)
    .execute(pool)
    .await;
}