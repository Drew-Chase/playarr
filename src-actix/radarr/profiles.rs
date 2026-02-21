use actix_web::{get, web, HttpResponse, Responder};
use crate::http_error::Result;
use crate::radarr::client::RadarrClient;

#[get("/qualityprofile")]
async fn quality_profiles(
    radarr: web::Data<RadarrClient>,
) -> Result<impl Responder> {
    let resp = radarr
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
    radarr: web::Data<RadarrClient>,
) -> Result<impl Responder> {
    let resp = radarr
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
