use actix_web::{get, web, HttpResponse, Responder};
use serde::Deserialize;
use crate::http_error::Result;
use crate::sonarr::client::SonarrClient;

#[derive(Deserialize)]
struct CalendarQuery {
    start: Option<String>,
    end: Option<String>,
}

#[get("/calendar")]
async fn calendar(
    sonarr: web::Data<SonarrClient>,
    query: web::Query<CalendarQuery>,
) -> Result<impl Responder> {
    let now = chrono::Utc::now();
    let start = query.start.clone()
        .unwrap_or_else(|| now.format("%Y-%m-%d").to_string());
    let end = query.end.clone()
        .unwrap_or_else(|| (now + chrono::Duration::days(14)).format("%Y-%m-%d").to_string());

    let resp = sonarr
        .get("/calendar")
        .query(&[("start", start.as_str()), ("end", end.as_str()), ("includeSeries", "true")])
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
