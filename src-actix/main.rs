#[actix_web::main]
async fn main()->anyhow::Result<()>{
	playarr_lib::run().await
}
