use actix_web::{get, put, web, HttpResponse, Responder};
use serde::Deserialize;
use crate::http_error::Result;
use crate::sonarr::client::SonarrClient;

#[derive(Deserialize)]
struct EpisodesQuery {
    #[serde(rename = "seriesId")]
    series_id: u64,
}

#[get("/episodes")]
async fn list_episodes(
    sonarr: web::Data<SonarrClient>,
    query: web::Query<EpisodesQuery>,
) -> Result<impl Responder> {
    let resp = sonarr
        .get("/episode")
        .query(&[("seriesId", query.series_id.to_string())])
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to fetch episodes: {}", e))?;

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to parse episodes: {}", e))?;

    Ok(HttpResponse::Ok().json(body))
}

#[put("/episode/monitor")]
async fn monitor_episodes(
    sonarr: web::Data<SonarrClient>,
    body: web::Json<serde_json::Value>,
) -> Result<impl Responder> {
    let resp = sonarr
        .put("/episode/monitor")
        .json(&body.into_inner())
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to update episode monitoring: {}", e))?;

    let status = resp.status();
    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to parse monitor response: {}", e))?;

    if status.is_success() {
        Ok(HttpResponse::Ok().json(body))
    } else {
        Ok(HttpResponse::BadRequest().json(body))
    }
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(list_episodes).service(monitor_episodes);
}
