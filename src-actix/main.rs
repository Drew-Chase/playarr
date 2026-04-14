#[actix_web::main]
async fn main()->color_eyre::eyre::Result<()>{
	playarr_lib::run().await
}
