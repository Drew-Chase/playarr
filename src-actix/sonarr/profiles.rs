use actix_web::{get, web, HttpResponse, Responder};
use crate::http_error::Result;
use crate::sonarr::client::SonarrClient;

#[get("/qualityprofile")]
async fn quality_profiles(
    sonarr: web::Data<SonarrClient>,
) -> Result<impl Responder> {
    let resp = sonarr
        .get("/qualityprofile")
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to fetch quality profiles: {}", e))?;

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to parse quality profiles: {}", e))?;

    Ok(HttpResponse::Ok().json(body))
}

#[get("/rootfolder")]
async fn root_folders(
    sonarr: web::Data<SonarrClient>,
) -> Result<impl Responder> {
    let resp = sonarr
        .get("/rootfolder")
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to fetch root folders: {}", e))?;

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to parse root folders: {}", e))?;

    Ok(HttpResponse::Ok().json(body))
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(quality_profiles).service(root_folders);
}
