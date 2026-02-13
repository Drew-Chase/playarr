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
    let client_id = cfg.plex.client_id.clone();
    drop(cfg);
    let session = Uuid::new_v4().to_string();

    let req = plex.get(&format!("/library/metadata/{}", id))?;
    let body = plex.send_json(req).await?;

    let metadata = &body["MediaContainer"]["Metadata"][0];
    let media = &metadata["Media"][0];
    let part = &media["Part"][0];
    let part_key = part["key"].as_str().unwrap_or("");

    let direct_play = query.direct_play.unwrap_or(true);
    let direct_stream = query.direct_stream.unwrap_or(false);

    if direct_play && !direct_stream {
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
    } else if direct_stream {
        // DirectStream: video passes through untouched, only audio is transcoded
        let transcode_url = format!(
            "{}/video/:/transcode/universal/start.m3u8?\
            path=/library/metadata/{}&mediaIndex=0&partIndex=0\
            &protocol=hls\
            &directPlay=0&directStream=1&directStreamAudio=0\
            &videoBitrate=200000\
            &autoAdjustQuality=0\
            &subtitleSize=100&audioBoost=100\
            &location=lan&transcodeSessionId={}",
            base_url, id, session
        );

        // Proxy through backend — X-Plex-Token must be a header
        let resp = plex.http
            .get(&transcode_url)
            .header("X-Plex-Token", &token)
            .header("X-Plex-Client-Identifier", &client_id)
            .header("X-Plex-Product", "Playarr")
            .header("X-Plex-Platform", "Chrome")
            .send()
            .await
            .map_err(|e| anyhow::anyhow!("DirectStream request failed: {}", e))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(anyhow::anyhow!(
                "Plex directstream returned {}: {}",
                status.as_u16(),
                &body[..body.len().min(200)]
            ).into());
        }

        let m3u8_body = resp.text().await
            .map_err(|e| anyhow::anyhow!("Failed to read m3u8: {}", e))?;

        let session_path = m3u8_body.lines()
            .find(|line| !line.starts_with('#') && !line.is_empty())
            .ok_or_else(|| anyhow::anyhow!("No session URL in m3u8 response"))?;

        let stream_url = if session_path.starts_with("http") {
            session_path.to_string()
        } else {
            format!("{}/video/:/transcode/universal/{}", base_url, session_path)
        };

        Ok(HttpResponse::Ok().json(serde_json::json!({
            "url": stream_url,
            "type": "directstream",
            "media": media,
            "part": part
        })))
    } else {
        // Quality presets: bitrate in kbps
        let bitrate = match query.quality.as_deref() {
            Some("4k") => "20000",
            Some("1080p") | Some("1080") => "10000",
            Some("720p") | Some("720") => "4000",
            Some("480p") | Some("480") => "1500",
            Some("original") => "200000",
            _ => "10000",
        };

        // Match Plex Web's profile extra format, pre-URL-encoded:
        // Raw: add-limitation(scope=videoCodec&scopeName=*&type=upperBound
        //        &name=video.bitrate&value={bitrate}&replace=true)
        //      +append-transcode-target-codec(type=videoProfile&context=streaming
        //        &videoCodec=h264&audioCodec=aac&protocol=hls)
        let profile_extra_encoded = format!(
            "add-limitation%28scope%3DvideoCodec%26scopeName%3D%2A%26type%3DupperBound\
            %26name%3Dvideo.bitrate%26value%3D{bitrate}%26replace%3Dtrue%29\
            %2Bappend-transcode-target-codec%28type%3DvideoProfile%26context%3Dstreaming\
            %26videoCodec%3Dh264%26audioCodec%3Daac%26protocol%3Dhls%29"
        );

        let session_id = Uuid::new_v4().to_string();

        // Build full URL matching Plex Web's format (all params as query string)
        let transcode_url = format!(
            "{base_url}/video/:/transcode/universal/start.m3u8?\
            hasMDE=1\
            &path=%2Flibrary%2Fmetadata%2F{id}\
            &mediaIndex=0&partIndex=0\
            &protocol=hls&fastSeek=1\
            &directPlay=0&directStream=0&directStreamAudio=0\
            &subtitleSize=100&audioBoost=100\
            &location=lan\
            &maxVideoBitrate={bitrate}\
            &addDebugOverlay=0\
            &autoAdjustQuality=0\
            &mediaBufferSize=102400\
            &session={session}\
            &X-Plex-Session-Identifier={session_id}\
            &X-Plex-Client-Profile-Extra={profile_extra_encoded}\
            &X-Plex-Incomplete-Segments=1\
            &X-Plex-Product=Playarr\
            &X-Plex-Client-Identifier={client_id}\
            &X-Plex-Platform=Chrome\
            &X-Plex-Token={token}"
        );

        let resp = plex.http
            .get(&transcode_url)
            .send()
            .await
            .map_err(|e| anyhow::anyhow!("Transcode request failed: {}", e))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(anyhow::anyhow!(
                "Plex transcode returned {}: {}",
                status.as_u16(),
                &body[..body.len().min(200)]
            ).into());
        }

        let m3u8_body = resp.text().await
            .map_err(|e| anyhow::anyhow!("Failed to read m3u8: {}", e))?;

        // Extract session URL from master m3u8 (first non-comment, non-empty line)
        let session_path = m3u8_body.lines()
            .find(|line| !line.starts_with('#') && !line.is_empty())
            .ok_or_else(|| anyhow::anyhow!("No session URL in m3u8 response"))?;

        // Build absolute URL — session URLs don't need auth (session ID is the auth)
        let stream_url = if session_path.starts_with("http") {
            session_path.to_string()
        } else {
            format!(
                "{}/video/:/transcode/universal/{}",
                base_url, session_path
            )
        };

        Ok(HttpResponse::Ok().json(serde_json::json!({
            "url": stream_url,
            "type": "hls",
            "media": media,
            "part": part,
            "debug_m3u8": m3u8_body,
            "debug_url": transcode_url
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
