use actix_web::{get, web, HttpResponse, Responder};
use crate::config::SharedConfig;
use crate::http_error::Result;

const TMDB_BASE: &str = "https://api.themoviedb.org/3";

fn tmdb_client() -> reqwest::Client {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .expect("Failed to create HTTP client")
}

#[get("/trending")]
async fn trending(
    config: web::Data<SharedConfig>,
) -> Result<impl Responder> {
    let cfg = config.read().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
    if cfg.tmdb.api_key.is_empty() {
        return Err(crate::http_error::Error::ServiceUnavailable(
            "TMDB API key not configured".to_string(),
        ));
    }

    let client = tmdb_client();
    let movies = client
        .get(format!("{}/trending/movie/week", TMDB_BASE))
        .query(&[("api_key", cfg.tmdb.api_key.as_str())])
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("TMDB request failed: {}", e))?
        .json::<serde_json::Value>()
        .await
        .map_err(|e| anyhow::anyhow!("TMDB parse failed: {}", e))?;

    let tv = client
        .get(format!("{}/trending/tv/week", TMDB_BASE))
        .query(&[("api_key", cfg.tmdb.api_key.as_str())])
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("TMDB request failed: {}", e))?
        .json::<serde_json::Value>()
        .await
        .map_err(|e| anyhow::anyhow!("TMDB parse failed: {}", e))?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "movies": movies["results"],
        "tv": tv["results"]
    })))
}

#[get("/upcoming")]
async fn upcoming(
    config: web::Data<SharedConfig>,
) -> Result<impl Responder> {
    let cfg = config.read().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
    if cfg.tmdb.api_key.is_empty() {
        return Err(crate::http_error::Error::ServiceUnavailable(
            "TMDB API key not configured".to_string(),
        ));
    }

    let client = tmdb_client();
    let movies = client
        .get(format!("{}/movie/upcoming", TMDB_BASE))
        .query(&[("api_key", cfg.tmdb.api_key.as_str())])
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("TMDB request failed: {}", e))?
        .json::<serde_json::Value>()
        .await
        .map_err(|e| anyhow::anyhow!("TMDB parse failed: {}", e))?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "movies": movies["results"]
    })))
}

#[get("/recent")]
async fn recent(
    config: web::Data<SharedConfig>,
) -> Result<impl Responder> {
    let cfg = config.read().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
    if cfg.tmdb.api_key.is_empty() {
        return Err(crate::http_error::Error::ServiceUnavailable(
            "TMDB API key not configured".to_string(),
        ));
    }

    let now = chrono::Utc::now();
    let month_ago = (now - chrono::Duration::days(30)).format("%Y-%m-%d").to_string();
    let today = now.format("%Y-%m-%d").to_string();

    let client = tmdb_client();
    let movies = client
        .get(format!("{}/discover/movie", TMDB_BASE))
        .query(&[
            ("api_key", cfg.tmdb.api_key.as_str()),
            ("sort_by", "popularity.desc"),
            ("primary_release_date.gte", month_ago.as_str()),
            ("primary_release_date.lte", today.as_str()),
        ])
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("TMDB request failed: {}", e))?
        .json::<serde_json::Value>()
        .await
        .map_err(|e| anyhow::anyhow!("TMDB parse failed: {}", e))?;

    let tv = client
        .get(format!("{}/discover/tv", TMDB_BASE))
        .query(&[
            ("api_key", cfg.tmdb.api_key.as_str()),
            ("sort_by", "popularity.desc"),
            ("first_air_date.gte", month_ago.as_str()),
            ("first_air_date.lte", today.as_str()),
        ])
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("TMDB request failed: {}", e))?
        .json::<serde_json::Value>()
        .await
        .map_err(|e| anyhow::anyhow!("TMDB parse failed: {}", e))?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "movies": movies["results"],
        "tv": tv["results"]
    })))
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/discover")
            .service(trending)
            .service(upcoming)
            .service(recent),
    );
}
