#[tokio::main]
async fn main() -> anyhow::Result<()> {
    storage::run().await
}
