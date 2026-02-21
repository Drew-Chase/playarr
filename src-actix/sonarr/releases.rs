use actix_web::{get, post, web, HttpResponse, Responder};
use crate::http_error::Result;
use crate::sonarr::client::SonarrClient;

#[derive(serde::Deserialize)]
struct ReleaseQuery {
    #[serde(rename = "episodeId")]
    episode_id: Option<u64>,
    #[serde(rename = "seriesId")]
    series_id: Option<u64>,
    #[serde(rename = "seasonNumber")]
    season_number: Option<u32>,
}

#[get("/release")]
async fn get_releases(
    sonarr: web::Data<SonarrClient>,
    query: web::Query<ReleaseQuery>,
) -> Result<impl Responder> {
    let mut params: Vec<(&str, String)> = Vec::new();
    if let Some(id) = query.episode_id {
        params.push(("episodeId", id.to_string()));
    }
    if let Some(id) = query.series_id {
        params.push(("seriesId", id.to_string()));
    }
    if let Some(num) = query.season_number {
        params.push(("seasonNumber", num.to_string()));
    }

    let resp = sonarr
        .get("/release")
        .query(&params)
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to fetch releases: {}", e))?;

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to parse releases: {}", e))?;

    Ok(HttpResponse::Ok().json(body))
}

#[post("/release")]
async fn grab_release(
    sonarr: web::Data<SonarrClient>,
    body: web::Json<serde_json::Value>,
) -> Result<impl Responder> {
    let resp = sonarr
        .post("/release")
        .json(&body.into_inner())
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to grab release: {}", e))?;

    let status = resp.status();
    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to parse grab response: {}", e))?;

    if status.is_success() {
        Ok(HttpResponse::Ok().json(body))
    } else {
        Ok(HttpResponse::BadRequest().json(body))
    }
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(get_releases).service(grab_release);
}
