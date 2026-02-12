use actix_web::{get, web, HttpResponse, Responder};
use crate::http_error::Result;
use crate::sonarr::client::SonarrClient;

#[get("/queue")]
async fn queue(
    sonarr: web::Data<SonarrClient>,
) -> Result<impl Responder> {
    let resp = sonarr
        .get("/queue")
        .query(&[("pageSize", "50"), ("includeSeries", "true"), ("includeEpisode", "true")])
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
