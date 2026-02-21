use actix_web::{get, post, web, HttpRequest, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use crate::config::SharedConfig;
use crate::http_error::{self, Result};
use crate::plex::client::PlexClient;

const OPENSUBTITLES_API: &str = "https://api.opensubtitles.com/api/v1";
const OPENSUBTITLES_API_KEY: &str = env!("OPENSUBTITLES_API_KEY");

fn user_agent() -> String {
    format!("Playarr v{}", env!("CARGO_PKG_VERSION"))
}

/// Get the OpenSubtitles API key, preferring the config value over the compiled-in default.
fn api_key(config: &SharedConfig) -> String {
    if let Ok(cfg) = config.read() {
        if !cfg.opensubtitles.api_key.is_empty() {
            return cfg.opensubtitles.api_key.clone();
        }
    }
    OPENSUBTITLES_API_KEY.to_string()
}

fn require_api_key(config: &SharedConfig) -> Result<String> {
    let key = api_key(config);
    if key.is_empty() {
        return Err(http_error::Error::ServiceUnavailable(
            "OpenSubtitles API key is not configured.".to_string(),
        ));
    }
    Ok(key)
}

// --- Search ---

#[derive(Deserialize)]
struct SearchQuery {
    query: Option<String>,
    imdb_id: Option<String>,
    tmdb_id: Option<String>,
    /// For episodes: the show's ratingKey so we can resolve the show's IMDB/TMDB ID.
    show_rating_key: Option<String>,
    season: Option<u32>,
    episode: Option<u32>,
    languages: Option<String>,
    foreign_parts_only: Option<bool>,
}

#[derive(Serialize)]
struct SubtitleSearchResult {
    subtitle_id: String,
    file_id: i64,
    file_name: String,
    language: String,
    download_count: i64,
    hearing_impaired: bool,
    foreign_parts_only: bool,
    ai_translated: bool,
}

#[get("/search")]
async fn search_subtitles(
    req: HttpRequest,
    config: web::Data<SharedConfig>,
    plex: web::Data<PlexClient>,
    query: web::Query<SearchQuery>,
) -> Result<impl Responder> {
    // Require authenticated user (non-guest)
    PlexClient::user_from_request(&req)
        .ok_or_else(|| http_error::Error::Unauthorized("Not signed in".to_string()))?;

    let api_key = require_api_key(&config)?;

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| anyhow::anyhow!("Failed to create HTTP client: {}", e))?;

    // For episodes, resolve the show's IMDB/TMDB IDs from Plex.
    // Episode-level IDs don't work with OpenSubtitles — it needs the show's ID + season/episode.
    let (resolved_imdb, resolved_tmdb) = if let Some(ref show_key) = query.show_rating_key {
        resolve_show_guids(&plex, show_key).await
    } else {
        (None, None)
    };

    let mut params: Vec<(&str, String)> = Vec::new();
    if let Some(ref q) = query.query {
        if !q.is_empty() {
            params.push(("query", q.clone()));
        }
    }
    // Prefer resolved show IDs (for episodes), fall back to directly-passed IDs (for movies)
    let imdb = resolved_imdb.as_deref().or(query.imdb_id.as_deref());
    let tmdb = resolved_tmdb.as_deref().or(query.tmdb_id.as_deref());
    if let Some(id) = imdb {
        if !id.is_empty() {
            params.push(("imdb_id", id.to_string()));
        }
    }
    if let Some(id) = tmdb {
        if !id.is_empty() {
            params.push(("tmdb_id", id.to_string()));
        }
    }
    if let Some(s) = query.season {
        params.push(("season_number", s.to_string()));
    }
    if let Some(e) = query.episode {
        params.push(("episode_number", e.to_string()));
    }
    if let Some(ref langs) = query.languages {
        if !langs.is_empty() {
            params.push(("languages", langs.clone()));
        }
    }
    if query.foreign_parts_only == Some(true) {
        params.push(("foreign_parts_only", "include".to_string()));
    }

    let resp = client
        .get(format!("{}/subtitles", OPENSUBTITLES_API))
        .header("Api-Key", &api_key)
        .header("User-Agent", user_agent())
        .query(&params)
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("OpenSubtitles request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(anyhow::anyhow!(
            "OpenSubtitles returned {}: {}",
            status.as_u16(),
            &body[..body.len().min(300)]
        ).into());
    }

    let body: serde_json::Value = resp.json().await
        .map_err(|e| anyhow::anyhow!("Failed to parse OpenSubtitles response: {}", e))?;

    let results: Vec<SubtitleSearchResult> = body["data"]
        .as_array()
        .unwrap_or(&Vec::new())
        .iter()
        .filter_map(|item| {
            let attrs = &item["attributes"];
            let file = attrs["files"].as_array()?.first()?;
            Some(SubtitleSearchResult {
                subtitle_id: item["id"].as_str().unwrap_or_default().to_string(),
                file_id: file["file_id"].as_i64().unwrap_or(0),
                file_name: file["file_name"].as_str().unwrap_or_default().to_string(),
                language: attrs["language"].as_str().unwrap_or_default().to_string(),
                download_count: attrs["download_count"].as_i64().unwrap_or(0),
                hearing_impaired: attrs["hearing_impaired"].as_bool().unwrap_or(false),
                foreign_parts_only: attrs["foreign_parts_only"].as_bool().unwrap_or(false),
                ai_translated: attrs["ai_translated"].as_bool().unwrap_or(false),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(results))
}

// --- Download (returns VTT for local use) ---

#[derive(Deserialize)]
struct DownloadBody {
    file_id: i64,
}

/// Download a subtitle from OpenSubtitles and return it as VTT.
#[post("/download")]
async fn download_subtitle(
    req: HttpRequest,
    config: web::Data<SharedConfig>,
    body: web::Json<DownloadBody>,
) -> Result<impl Responder> {
    PlexClient::user_from_request(&req)
        .ok_or_else(|| http_error::Error::Unauthorized("Not signed in".to_string()))?;

    let api_key = require_api_key(&config)?;
    let srt_content = fetch_subtitle_content(&api_key, body.file_id).await?;
    let vtt_content = srt_to_vtt(&srt_content);

    Ok(HttpResponse::Ok()
        .content_type("text/vtt; charset=utf-8")
        .body(vtt_content))
}

// --- Upload to Plex ---

#[derive(Deserialize)]
struct UploadToPlexBody {
    file_id: i64,
    rating_key: String,
    language_code: String,
}

#[post("/upload-to-plex")]
async fn upload_to_plex(
    req: HttpRequest,
    config: web::Data<SharedConfig>,
    plex: web::Data<PlexClient>,
    body: web::Json<UploadToPlexBody>,
) -> Result<impl Responder> {
    PlexClient::user_from_request(&req)
        .ok_or_else(|| http_error::Error::Unauthorized("Not signed in".to_string()))?;

    let api_key = require_api_key(&config)?;
    let srt_content = fetch_subtitle_content(&api_key, body.file_id).await?;

    // Upload to Plex via POST /library/metadata/{id}/subtitles
    // Plex expects raw file bytes as the body (NOT multipart), with metadata as query params.
    let cfg = plex.config.read().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
    let base_url = cfg.plex.url.trim_end_matches('/').to_string();
    let token = cfg.plex.token.clone();
    drop(cfg);

    let upload_url = format!(
        "{}/library/metadata/{}/subtitles",
        base_url, body.rating_key
    );

    let resp = plex.http
        .post(&upload_url)
        .query(&[
            ("X-Plex-Token", token.as_str()),
            ("title", "Subtitle"),
            ("language", &body.language_code),
            ("hearingImpaired", "0"),
            ("forced", "0"),
            ("format", "srt"),
        ])
        .header("Content-Type", "application/octet-stream")
        .header("Accept", "text/plain, */*")
        .body(srt_content.into_bytes())
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Plex upload failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(anyhow::anyhow!(
            "Plex subtitle upload returned {}: {}",
            status.as_u16(),
            &body[..body.len().min(200)]
        ).into());
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({ "success": true })))
}

// --- Helpers ---

/// Fetch a subtitle file's content from OpenSubtitles (two-step: get download link, then fetch).
async fn fetch_subtitle_content(api_key: &str, file_id: i64) -> Result<String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| anyhow::anyhow!("Failed to create HTTP client: {}", e))?;

    // Step 1: Request download link
    let resp = client
        .post(format!("{}/download", OPENSUBTITLES_API))
        .header("Api-Key", api_key)
        .header("User-Agent", user_agent())
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({ "file_id": file_id }))
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("OpenSubtitles download request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(anyhow::anyhow!(
            "OpenSubtitles download API returned {}: {}",
            status.as_u16(),
            &body[..body.len().min(300)]
        ).into());
    }

    let dl_body: serde_json::Value = resp.json().await
        .map_err(|e| anyhow::anyhow!("Failed to parse download response: {}", e))?;

    let link = dl_body["link"].as_str()
        .ok_or_else(|| anyhow::anyhow!("No download link in OpenSubtitles response"))?;

    // Step 2: Fetch the actual subtitle file
    let file_resp = client
        .get(link)
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to download subtitle file: {}", e))?;

    if !file_resp.status().is_success() {
        return Err(anyhow::anyhow!(
            "Subtitle file download returned {}",
            file_resp.status().as_u16()
        ).into());
    }

    let content = file_resp.text().await
        .map_err(|e| anyhow::anyhow!("Failed to read subtitle file: {}", e))?;

    Ok(content)
}

/// Fetch the show's IMDB and TMDB IDs from Plex metadata Guid array.
/// Returns (imdb_id, tmdb_id) — either or both may be None.
async fn resolve_show_guids(plex: &PlexClient, rating_key: &str) -> (Option<String>, Option<String>) {
    let body = match plex.get_json_as_user(
        &format!("/library/metadata/{}", rating_key),
        "",
        &[],
    ).await {
        Ok(b) => b,
        Err(_) => return (None, None),
    };

    let guids = match body["MediaContainer"]["Metadata"][0]["Guid"].as_array() {
        Some(arr) => arr,
        None => return (None, None),
    };

    let mut imdb = None;
    let mut tmdb = None;
    for guid in guids {
        if let Some(id) = guid["id"].as_str() {
            if let Some(rest) = id.strip_prefix("imdb://") {
                imdb = Some(rest.to_string());
            } else if let Some(rest) = id.strip_prefix("tmdb://") {
                tmdb = Some(rest.to_string());
            }
        }
    }
    (imdb, tmdb)
}

/// Convert SRT subtitle content to WebVTT format.
fn srt_to_vtt(srt: &str) -> String {
    let mut vtt = String::with_capacity(srt.len() + 16);
    vtt.push_str("WEBVTT\n\n");

    for line in srt.lines() {
        // Replace SRT timestamp commas with VTT dots: 00:01:23,456 → 00:01:23.456
        if line.contains(" --> ") && line.contains(',') {
            vtt.push_str(&line.replace(',', "."));
        } else {
            vtt.push_str(line);
        }
        vtt.push('\n');
    }

    vtt
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/subtitles")
            .service(search_subtitles)
            .service(download_subtitle)
            .service(upload_to_plex),
    );
}
