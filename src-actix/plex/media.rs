use actix_web::{get, web, HttpResponse, Responder};
use serde::Deserialize;
use crate::http_error::Result;
use crate::plex::client::PlexClient;

#[get("/{id}")]
async fn get_metadata(
    plex: web::Data<PlexClient>,
    path: web::Path<String>,
) -> Result<impl Responder> {
    let id = path.into_inner();
    let req = plex.get(&format!("/library/metadata/{}", id))?;
    let body = plex.send_json(req).await?;

    let metadata = &body["MediaContainer"]["Metadata"];
    let item = metadata.get(0).unwrap_or(metadata);
    Ok(HttpResponse::Ok().json(item))
}

#[get("/{id}/children")]
async fn get_children(
    plex: web::Data<PlexClient>,
    path: web::Path<String>,
) -> Result<impl Responder> {
    let id = path.into_inner();
    let req = plex.get(&format!("/library/metadata/{}/children", id))?;
    let body = plex.send_json(req).await?;
    Ok(HttpResponse::Ok().json(&body["MediaContainer"]["Metadata"]))
}

#[get("/{id}/related")]
async fn get_related(
    plex: web::Data<PlexClient>,
    path: web::Path<String>,
) -> Result<impl Responder> {
    let id = path.into_inner();
    let req = plex.get(&format!("/library/metadata/{}/similar", id))?;
    let body = plex.send_json(req).await?;
    Ok(HttpResponse::Ok().json(&body["MediaContainer"]["Metadata"]))
}

#[derive(Deserialize)]
struct StreamQuery {
    quality: Option<String>,
    direct_play: Option<bool>,
}

#[get("/{id}/stream")]
async fn get_stream_url(
    plex: web::Data<PlexClient>,
    path: web::Path<String>,
    query: web::Query<StreamQuery>,
) -> Result<impl Responder> {
    let id = path.into_inner();
    let cfg = plex.config.read().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
    let base_url = cfg.plex.url.trim_end_matches('/').to_string();
    let token = cfg.plex.token.clone();
    drop(cfg);

    let req = plex.get(&format!("/library/metadata/{}", id))?;
    let body = plex.send_json(req).await?;

    let metadata = &body["MediaContainer"]["Metadata"][0];
    let media = &metadata["Media"][0];
    let part = &media["Part"][0];
    let part_key = part["key"].as_str().unwrap_or("");

    let direct_play = query.direct_play.unwrap_or(true);

    if direct_play {
        let stream_url = format!(
            "{}{}?X-Plex-Token={}",
            base_url, part_key, token
        );
        Ok(HttpResponse::Ok().json(serde_json::json!({
            "url": stream_url,
            "type": "direct",
            "media": media,
            "part": part
        })))
    } else {
        let bitrate = match query.quality.as_deref() {
            Some("4k") => "20000",
            Some("1080p") | Some("1080") => "8000",
            Some("720p") | Some("720") => "4000",
            Some("480p") | Some("480") => "2000",
            Some("original") => "200000",
            _ => "8000",
        };

        let transcode_url = format!(
            "{}/video/:/transcode/universal/start.m3u8?\
            path={}&mediaIndex=0&partIndex=0\
            &protocol=hls&fastSeek=1\
            &directPlay=0&directStream=1\
            &videoQuality=100&maxVideoBitrate={}\
            &subtitleSize=100&audioBoost=100\
            &X-Plex-Token={}&X-Plex-Platform=Chrome",
            base_url,
            urlencoding_path(&format!("/library/metadata/{}", id)),
            bitrate,
            token
        );

        Ok(HttpResponse::Ok().json(serde_json::json!({
            "url": transcode_url,
            "type": "hls",
            "media": media,
            "part": part
        })))
    }
}

#[get("/{id}/thumb")]
async fn get_thumb(
    plex: web::Data<PlexClient>,
    path: web::Path<String>,
) -> Result<impl Responder> {
    let id = path.into_inner();
    proxy_image(&plex, &format!("/library/metadata/{}/thumb", id)).await
}

#[get("/{id}/art")]
async fn get_art(
    plex: web::Data<PlexClient>,
    path: web::Path<String>,
) -> Result<impl Responder> {
    let id = path.into_inner();
    proxy_image(&plex, &format!("/library/metadata/{}/art", id)).await
}

#[derive(Deserialize)]
struct ImageQuery {
    path: String,
    width: Option<u32>,
    height: Option<u32>,
}

#[get("/image")]
async fn get_image(
    plex: web::Data<PlexClient>,
    query: web::Query<ImageQuery>,
) -> Result<impl Responder> {
    let encoded_url = query.path.replace('%', "%25").replace('&', "%26").replace('?', "%3F").replace('=', "%3D").replace(' ', "%20").replace('#', "%23");
    let mut plex_path = format!("/photo/:/transcode?url={}", encoded_url);
    if let Some(w) = query.width {
        plex_path.push_str(&format!("&width={}", w));
    }
    if let Some(h) = query.height {
        plex_path.push_str(&format!("&height={}", h));
    }
    plex_path.push_str("&minSize=1&upscale=1");
    proxy_image(&plex, &plex_path).await
}

async fn proxy_image(plex: &PlexClient, path: &str) -> Result<HttpResponse> {
    let req = plex.get_image(path)?;
    let resp = req.send().await
        .map_err(|e| anyhow::anyhow!("Plex image request failed: {}", e))?;

    if !resp.status().is_success() {
        return Ok(HttpResponse::NotFound().finish());
    }

    let content_type = resp
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("image/jpeg")
        .to_string();

    let bytes = resp.bytes().await
        .map_err(|e| anyhow::anyhow!("Failed to read image bytes: {}", e))?;

    Ok(HttpResponse::Ok()
        .content_type(content_type)
        .append_header(("Cache-Control", "public, max-age=86400"))
        .body(bytes))
}

fn urlencoding_path(path: &str) -> String {
    path.replace('/', "%2F").replace(':', "%3A")
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/media")
            .service(get_image)
            .service(get_stream_url)
            .service(get_thumb)
            .service(get_art)
            .service(get_children)
            .service(get_related)
            .service(get_metadata),
    );
}
