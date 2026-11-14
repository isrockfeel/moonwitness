/// Runtime configuration for the syslog service, loaded from environment.
#[derive(Debug, Clone)]
pub struct Config {
    pub host: String,
    pub http_port: u16,
    pub syslog_udp_port: u16,
    pub syslog_tcp_port: u16,
    pub database_url: String,
    pub max_messages: i64,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        let host = std::env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
        let http_port = std::env::var("HTTP_PORT")
            .unwrap_or_else(|_| "8093".to_string())
            .parse::<u16>()?;
        let syslog_udp_port = std::env::var("SYSLOG_UDP_PORT")
            .unwrap_or_else(|_| "5140".to_string())
            .parse::<u16>()?;
        let syslog_tcp_port = std::env::var("SYSLOG_TCP_PORT")
            .unwrap_or_else(|_| "5514".to_string())
            .parse::<u16>()?;
        let database_url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "sqlite:./syslog.db?mode=rwc".to_string());
        let max_messages = std::env::var("SYSLOG_MAX_MESSAGES")
            .unwrap_or_else(|_| "100000".to_string())
            .parse::<i64>()?;

        Ok(Config {
            host,
            http_port,
            syslog_udp_port,
            syslog_tcp_port,
            database_url,
            max_messages,
        })
    }
}
