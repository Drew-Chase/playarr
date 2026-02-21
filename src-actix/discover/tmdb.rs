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

#[derive(serde::Deserialize)]
struct VideosQuery {
    tmdb_id: u64,
    #[serde(rename = "type")]
    media_type: String,
}

#[get("/videos")]
async fn videos(
    query: web::Query<VideosQuery>,
) -> Result<impl Responder> {
    let media_type = match query.media_type.as_str() {
        "movie" => "movie",
        "tv" => "tv",
        _ => return Err(crate::http_error::Error::BadRequest(
            "type must be 'movie' or 'tv'".to_string(),
        )),
    };

    let client = tmdb_client();
    let resp = client
        .get(format!("{}/{}/{}/videos", TMDB_BASE, media_type, query.tmdb_id))
        .query(&[("api_key", TMDB_API_KEY)])
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("TMDB request failed: {}", e))?;

    if resp.status() == reqwest::StatusCode::NOT_FOUND {
        return Ok(HttpResponse::Ok().json(serde_json::json!({ "results": [] })));
    }

    let body = resp
        .json::<serde_json::Value>()
        .await
        .map_err(|e| anyhow::anyhow!("TMDB parse failed: {}", e))?;

    let results: Vec<&serde_json::Value> = body["results"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter(|v| {
                    v["site"].as_str() == Some("YouTube")
                        && matches!(v["type"].as_str(), Some("Trailer") | Some("Teaser"))
                })
                .collect()
        })
        .unwrap_or_default();

    Ok(HttpResponse::Ok().json(serde_json::json!({ "results": results })))
}

#[get("/movie/{id}")]
async fn movie_detail(
    path: web::Path<u64>,
) -> Result<impl Responder> {
    let id = path.into_inner();
    let client = tmdb_client();
    let resp = client
        .get(format!("{}/movie/{}", TMDB_BASE, id))
        .query(&[
            ("api_key", TMDB_API_KEY),
            ("append_to_response", "credits,videos,external_ids"),
        ])
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("TMDB request failed: {}", e))?;

    if resp.status() == reqwest::StatusCode::NOT_FOUND {
        return Err(crate::http_error::Error::NotFound("Movie not found".to_string()));
    }

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| anyhow::anyhow!("TMDB parse failed: {}", e))?;

    Ok(HttpResponse::Ok().json(body))
}

#[get("/tv/{id}")]
async fn tv_detail(
    path: web::Path<u64>,
) -> Result<impl Responder> {
    let id = path.into_inner();
    let client = tmdb_client();
    let resp = client
        .get(format!("{}/tv/{}", TMDB_BASE, id))
        .query(&[
            ("api_key", TMDB_API_KEY),
            ("append_to_response", "credits,videos,external_ids"),
        ])
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("TMDB request failed: {}", e))?;

    if resp.status() == reqwest::StatusCode::NOT_FOUND {
        return Err(crate::http_error::Error::NotFound("TV show not found".to_string()));
    }

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| anyhow::anyhow!("TMDB parse failed: {}", e))?;

    Ok(HttpResponse::Ok().json(body))
}

#[get("/tv/{id}/season/{season_number}")]
async fn tv_season(
    path: web::Path<(u64, u32)>,
) -> Result<impl Responder> {
    let (id, season_number) = path.into_inner();
    let client = tmdb_client();
    let resp = client
        .get(format!("{}/tv/{}/season/{}", TMDB_BASE, id, season_number))
        .query(&[("api_key", TMDB_API_KEY)])
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("TMDB request failed: {}", e))?;

    if resp.status() == reqwest::StatusCode::NOT_FOUND {
        return Err(crate::http_error::Error::NotFound("Season not found".to_string()));
    }

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| anyhow::anyhow!("TMDB parse failed: {}", e))?;

    Ok(HttpResponse::Ok().json(body))
}

/// Stream a YouTube video through rusty_ytdl so the frontend can play it
/// via a native `<video>` element. rusty_ytdl handles all YouTube auth
/// and header requirements internally, avoiding 403 errors.
#[get("/youtube-stream/{video_id}")]
async fn youtube_stream(
    path: web::Path<String>,
) -> Result<HttpResponse> {
    let video_id = path.into_inner();
    let yt_url = format!("https://www.youtube.com/watch?v={}", video_id);

    let options = rusty_ytdl::VideoOptions {
        quality: rusty_ytdl::VideoQuality::Highest,
        filter: rusty_ytdl::VideoSearchOptions::VideoAudio,
        ..Default::default()
    };

    let video = rusty_ytdl::Video::new_with_options(&yt_url, options)
        .map_err(|e| anyhow::anyhow!("YouTube parse error: {}", e))?;

    // Get video info for content type
    let info = video.get_info().await
        .map_err(|e| anyhow::anyhow!("YouTube info error: {}", e))?;

    let format = info.formats.iter()
        .filter(|f| f.has_video && f.has_audio)
        .max_by_key(|f| f.bitrate)
        .ok_or_else(|| anyhow::anyhow!("No video+audio format found"))?;

    let content_type = format!("{}/{}", format.mime_type.mime.type_(), format.mime_type.mime.subtype());
    let content_length = format.content_length.as_ref()
        .and_then(|cl| cl.parse::<u64>().ok());

    // Use rusty_ytdl's stream which handles YouTube auth internally
    let stream = video.stream().await
        .map_err(|e| anyhow::anyhow!("YouTube stream error: {}", e))?;

    let byte_stream = futures_util::stream::unfold(stream, |s| async move {
        match s.chunk().await {
            Ok(Some(chunk)) => Some((
                Ok::<_, actix_web::Error>(web::Bytes::from(chunk.to_vec())),
                s,
            )),
            _ => None,
        }
    });

    let mut builder = HttpResponse::Ok();
    builder.insert_header(("Content-Type", content_type));
    if let Some(len) = content_length {
        builder.insert_header(("Content-Length", len.to_string()));
    }

    Ok(builder.streaming(byte_stream))
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/discover")
            .service(trending)
            .service(upcoming)
            .service(recent)
            .service(logo)
            .service(videos)
            .service(movie_detail)
            .service(tv_season)
            .service(tv_detail)
            .service(youtube_stream),
    );
}
