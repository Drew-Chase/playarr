use actix_web::{get, web, HttpResponse, Responder};
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

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(list_episodes);
}
