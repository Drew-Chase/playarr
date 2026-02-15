use actix_web::{get, web, HttpResponse, Responder};
use crate::http_error::Result;

const TMDB_BASE: &str = "https://api.themoviedb.org/3";
const TMDB_API_KEY: &str = env!("TMDB_API_KEY");

fn tmdb_client() -> reqwest::Client {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .expect("Failed to create HTTP client")
}

#[get("/trending")]
async fn trending() -> Result<impl Responder> {
    let client = tmdb_client();
    let movies = client
        .get(format!("{}/trending/movie/week", TMDB_BASE))
        .query(&[("api_key", TMDB_API_KEY)])
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("TMDB request failed: {}", e))?
        .json::<serde_json::Value>()
        .await
        .map_err(|e| anyhow::anyhow!("TMDB parse failed: {}", e))?;

    let tv = client
        .get(format!("{}/trending/tv/week", TMDB_BASE))
        .query(&[("api_key", TMDB_API_KEY)])
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
async fn upcoming() -> Result<impl Responder> {
    let client = tmdb_client();
    let movies = client
        .get(format!("{}/movie/upcoming", TMDB_BASE))
        .query(&[("api_key", TMDB_API_KEY)])
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
async fn recent() -> Result<impl Responder> {
    let now = chrono::Utc::now();
    let month_ago = (now - chrono::Duration::days(30)).format("%Y-%m-%d").to_string();
    let today = now.format("%Y-%m-%d").to_string();

    let client = tmdb_client();
    let movies = client
        .get(format!("{}/discover/movie", TMDB_BASE))
        .query(&[
            ("api_key", TMDB_API_KEY),
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
            ("api_key", TMDB_API_KEY),
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

#[derive(serde::Deserialize)]
struct LogoQuery {
    tmdb_id: u64,
    #[serde(rename = "type")]
    media_type: String,
    lang: Option<String>,
}

#[get("/logo")]
async fn logo(
    query: web::Query<LogoQuery>,
) -> Result<impl Responder> {
    let media_type = match query.media_type.as_str() {
        "movie" => "movie",
        "tv" => "tv",
        _ => return Err(crate::http_error::Error::BadRequest(
            "type must be 'movie' or 'tv'".to_string(),
        )),
    };

    let client = tmdb_client();

    // Use the requested language, default to "en"
    let lang = query.lang.as_deref().unwrap_or("en");
    let image_languages = format!("{},null", lang);

    let resp = client
        .get(format!("{}/{}/{}/images", TMDB_BASE, media_type, query.tmdb_id))
        .query(&[
            ("api_key", TMDB_API_KEY),
            ("include_image_languages", image_languages.as_str()),
        ])
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("TMDB request failed: {}", e))?;

    if resp.status() == reqwest::StatusCode::NOT_FOUND {
        return Ok(HttpResponse::Ok().json(serde_json::json!({
            "logo_path": null
        })));
    }

    let body = resp
        .json::<serde_json::Value>()
        .await
        .map_err(|e| anyhow::anyhow!("TMDB parse failed: {}", e))?;

    // Prefer a logo matching the exact requested language,
    // then fall back to language-neutral (null) logos
    let logo_path = body["logos"]
        .as_array()
        .and_then(|logos| {
            logos.iter()
                .find(|l| l["iso_639_1"].as_str() == Some(lang))
                .or_else(|| logos.iter().find(|l| l["iso_639_1"].is_null()))
        })
        .and_then(|logo| logo["file_path"].as_str())
        .map(|s| s.to_string());

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "logo_path": logo_path
    })))
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/discover")
            .service(trending)
            .service(upcoming)
            .service(recent)
            .service(logo),
    );
}
