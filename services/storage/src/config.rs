/// Runtime configuration for the storage service, loaded from environment.
#[derive(Debug, Clone)]
pub struct Config {
    pub host: String,
    pub http_port: u16,
    pub storage_root: String,
    pub database_url: String,
    pub access_key: String,
    pub secret_key: String,
    pub allow_anonymous: bool,
    pub max_object_size: u64,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        let host = std::env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
        let http_port = std::env::var("HTTP_PORT")
            .unwrap_or_else(|_| "8091".to_string())
            .parse::<u16>()?;
        let storage_root = std::env::var("STORAGE_ROOT").unwrap_or_else(|_| "./data".to_string());
        let database_url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "sqlite:./storage.db?mode=rwc".to_string());
        let access_key = std::env::var("STORAGE_ACCESS_KEY")
            .unwrap_or_else(|_| "moonwitness-storage".to_string());
        let secret_key = std::env::var("STORAGE_SECRET_KEY")
            .unwrap_or_else(|_| "change-me-storage-secret".to_string());
        let allow_anonymous = std::env::var("STORAGE_ALLOW_ANONYMOUS")
            .map(|v| matches!(v.trim().to_ascii_lowercase().as_str(), "1" | "true" | "yes"))
            .unwrap_or(false);
        let max_object_size = std::env::var("STORAGE_MAX_OBJECT_SIZE")
            .unwrap_or_else(|_| (512 * 1024 * 1024).to_string())
            .parse::<u64>()?;

        Ok(Config {
            host,
            http_port,
            storage_root,
            database_url,
            access_key,
            secret_key,
            allow_anonymous,
            max_object_size,
        })
    }
}
