use actix_web::{get, web, HttpResponse, Responder};
use crate::http_error::Result;
use crate::radarr::client::RadarrClient;

#[get("/calendar")]
async fn calendar(
    radarr: web::Data<RadarrClient>,
) -> Result<impl Responder> {
    let now = chrono::Utc::now();
    let start = now.format("%Y-%m-%d").to_string();
    let end = (now + chrono::Duration::days(30)).format("%Y-%m-%d").to_string();

    let resp = radarr
        .get("/calendar")
        .query(&[("start", start.as_str()), ("end", end.as_str())])
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to fetch calendar: {}", e))?;

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to parse calendar: {}", e))?;

    Ok(HttpResponse::Ok().json(body))
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(calendar);
}
