/// Runtime configuration for the RADIUS service, loaded from environment.
#[derive(Debug, Clone)]
pub struct Config {
    pub host: String,
    pub http_port: u16,
    pub radius_auth_port: u16,
    pub radius_acct_port: u16,
    pub radius_secret: String,
    pub database_url: String,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        let host = std::env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
        let http_port = std::env::var("HTTP_PORT")
            .unwrap_or_else(|_| "3000".to_string())
            .parse::<u16>()?;
        let radius_auth_port = std::env::var("RADIUS_AUTH_PORT")
            .unwrap_or_else(|_| "1812".to_string())
            .parse::<u16>()?;
        let radius_acct_port = std::env::var("RADIUS_ACCT_PORT")
            .unwrap_or_else(|_| "1813".to_string())
            .parse::<u16>()?;
        let radius_secret = std::env::var("RADIUS_SECRET")
            .unwrap_or_else(|_| "moonwitness-radius-secret".to_string());
        let database_url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "sqlite:./radius.db?mode=rwc".to_string());

        Ok(Config {
            host,
            http_port,
            radius_auth_port,
            radius_acct_port,
            radius_secret,
            database_url,
        })
    }
}