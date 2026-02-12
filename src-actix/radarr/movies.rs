use actix_web::{get, post, web, HttpResponse, Responder};
use serde::Deserialize;
use crate::http_error::Result;
use crate::radarr::client::RadarrClient;

#[derive(Deserialize)]
struct LookupQuery {
    term: String,
}

#[get("/lookup")]
async fn lookup(
    radarr: web::Data<RadarrClient>,
    query: web::Query<LookupQuery>,
) -> Result<impl Responder> {
    let resp = radarr
        .get("/movie/lookup")
        .query(&[("term", query.term.as_str())])
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to lookup movie: {}", e))?;

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to parse lookup: {}", e))?;

    Ok(HttpResponse::Ok().json(body))
}

#[post("/movie")]
async fn add_movie(
    radarr: web::Data<RadarrClient>,
    body: web::Json<serde_json::Value>,
) -> Result<impl Responder> {
    let resp = radarr
        .post("/movie")
        .json(&body.into_inner())
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to add movie: {}", e))?;

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
    cfg.service(lookup).service(add_movie);
}
