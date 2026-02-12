use actix_web::{get, post, web, HttpResponse, Responder};
use serde::Deserialize;
use crate::http_error::Result;
use crate::sonarr::client::SonarrClient;

#[derive(Deserialize)]
struct LookupQuery {
    term: String,
}

#[get("/lookup")]
async fn lookup(
    sonarr: web::Data<SonarrClient>,
    query: web::Query<LookupQuery>,
) -> Result<impl Responder> {
    let resp = sonarr
        .get("/series/lookup")
        .query(&[("term", query.term.as_str())])
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to lookup series: {}", e))?;

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to parse lookup: {}", e))?;

    Ok(HttpResponse::Ok().json(body))
}

#[post("/series")]
async fn add_series(
    sonarr: web::Data<SonarrClient>,
    body: web::Json<serde_json::Value>,
) -> Result<impl Responder> {
    let resp = sonarr
        .post("/series")
        .json(&body.into_inner())
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to add series: {}", e))?;

    let status = resp.status();
    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to parse add response: {}", e))?;

    if status.is_success() {
        Ok(HttpResponse::Ok().json(body))
    } else {
        Ok(HttpResponse::BadRequest().json(body))
    }
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(lookup).service(add_series);
}
