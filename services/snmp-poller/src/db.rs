use sqlx::SqlitePool;

pub type Pool = SqlitePool;

pub async fn init_db(url: &str) -> anyhow::Result<Pool> {
    let pool = SqlitePool::connect(url).await?;
    sqlx::migrate!("./migrations").run(&pool).await?;
    Ok(pool)
}
