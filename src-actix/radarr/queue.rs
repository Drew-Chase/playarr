use actix_web::{get, web, HttpResponse, Responder};
use crate::http_error::Result;
use crate::radarr::client::RadarrClient;

#[get("/queue")]
async fn queue(
    radarr: web::Data<RadarrClient>,
) -> Result<impl Responder> {
    let resp = radarr
        .get("/queue")
        .query(&[("pageSize", "50"), ("includeMovie", "true")])
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to fetch queue: {}", e))?;

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to parse queue: {}", e))?;

    Ok(HttpResponse::Ok().json(body))
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(queue);
}
