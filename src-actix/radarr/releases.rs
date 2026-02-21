use actix_web::{get, post, web, HttpResponse, Responder};
use crate::http_error::Result;
use crate::radarr::client::RadarrClient;

#[derive(serde::Deserialize)]
struct ReleaseQuery {
    #[serde(rename = "movieId")]
    movie_id: Option<u64>,
}

#[get("/release")]
async fn get_releases(
    radarr: web::Data<RadarrClient>,
    query: web::Query<ReleaseQuery>,
) -> Result<impl Responder> {
    let mut params: Vec<(&str, String)> = Vec::new();
    if let Some(id) = query.movie_id {
        params.push(("movieId", id.to_string()));
    }

    let resp = radarr
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
    radarr: web::Data<RadarrClient>,
    body: web::Json<serde_json::Value>,
) -> Result<impl Responder> {
    let resp = radarr
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
