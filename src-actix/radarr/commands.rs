use actix_web::{post, web, HttpResponse, Responder};
use crate::http_error::Result;
use crate::radarr::client::RadarrClient;

#[post("/command")]
async fn run_command(
    radarr: web::Data<RadarrClient>,
    body: web::Json<serde_json::Value>,
) -> Result<impl Responder> {
    let resp = radarr
        .post("/command")
        .json(&body.into_inner())
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to run command: {}", e))?;

    let status = resp.status();
    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to parse command response: {}", e))?;

    if status.is_success() {
        Ok(HttpResponse::Ok().json(body))
    } else {
        Ok(HttpResponse::BadRequest().json(body))
    }
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(run_command);
}
