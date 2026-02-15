use actix_web::{get, web, HttpRequest, HttpResponse, Responder};
use serde::Deserialize;
use uuid::Uuid;
use crate::http_error::Result;
use crate::plex::client::PlexClient;

#[get("/{id}")]
async fn get_metadata(
    req: HttpRequest,
    plex: web::Data<PlexClient>,
    path: web::Path<String>,
) -> Result<impl Responder> {
    let id = path.into_inner();
    let user_token = PlexClient::user_token_from_request(&req).unwrap_or_default();
    let body = plex.get_json_as_user(&format!("/library/metadata/{}", id), &user_token, &[]).await?;

    let metadata = &body["MediaContainer"]["Metadata"];
    let item = metadata.get(0).unwrap_or(metadata);
    Ok(HttpResponse::Ok().json(item))
}

#[get("/{id}/children")]
async fn get_children(
    req: HttpRequest,
    plex: web::Data<PlexClient>,
    path: web::Path<String>,
) -> Result<impl Responder> {
    let id = path.into_inner();
    let user_token = PlexClient::user_token_from_request(&req).unwrap_or_default();
    let body = plex.get_json_as_user(&format!("/library/metadata/{}/children", id), &user_token, &[]).await?;
    Ok(HttpResponse::Ok().json(&body["MediaContainer"]["Metadata"]))
}

#[get("/{id}/related")]
async fn get_related(
    plex: web::Data<PlexClient>,
    path: web::Path<String>,
) -> Result<impl Responder> {
    let id = path.into_inner();
    let req = plex.get(&format!("/library/metadata/{}/similar", id))?;
    let resp = req.send().await
        .map_err(|e| anyhow::anyhow!("Plex request failed: {}", e))?;

    if !resp.status().is_success() {
        return Ok(HttpResponse::Ok().json(serde_json::json!([])));
    }

    let body: serde_json::Value = resp.json().await
        .map_err(|e| anyhow::anyhow!("Failed to parse Plex JSON response: {}", e))?;
    Ok(HttpResponse::Ok().json(&body["MediaContainer"]["Metadata"]))
}

#[derive(Deserialize)]
struct StreamQuery {
    quality: Option<String>,
    direct_play: Option<bool>,
    direct_stream: Option<bool>,
}

#[get("/{id}/stream")]
async fn get_stream_url(
    req: HttpRequest,
    plex: web::Data<PlexClient>,
    path: web::Path<String>,
    query: web::Query<StreamQuery>,
) -> Result<impl Responder> {
    let id = path.into_inner();
    let cfg = plex.config.read().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
    let base_url = cfg.plex.url.trim_end_matches('/').to_string();
    let token = cfg.plex.token.clone();
    drop(cfg);
    // Use per-session client identifier so each browser tab gets its own
    // Plex transcode session, preventing multi-user conflicts.
    let client_id = plex.playback_client_id(&req);
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
        // Proxy through backend so local Plex IP is never exposed to clients
        let stream_url = format!("/api/media/stream-proxy{}", part_key);
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

        // Proxy through backend so local Plex IP is never exposed to clients
        let stream_url = if session_path.starts_with("http") {
            session_path.replace(
                &format!("{}/video/:/transcode/universal/", base_url),
                "/api/media/transcode/",
            )
        } else {
            format!("/api/media/transcode/{}", session_path)
        };

        Ok(HttpResponse::Ok().json(serde_json::json!({
            "url": stream_url,
            "type": "directstream",
            "media": media,
            "part": part
        })))
    } else {
        // Quality presets: (bitrate in kbps, resolution WxH)
        let (bitrate, resolution) = match query.quality.as_deref() {
            Some("4k") => ("20000", "3840x2160"),
            Some("1080p") | Some("1080") => ("10000", "1920x1080"),
            Some("720p") | Some("720") => ("4000", "1280x720"),
            Some("480p") | Some("480") => ("1500", "720x480"),
            Some("original") => ("200000", "1920x1080"),
            _ => ("10000", "1920x1080"),
        };

        let height = resolution.split('x').nth(1).unwrap_or("1080");
        let profile_extra = format!(
            "add-limitation(scope=videoCodec&scopeName=*&type=upperBound\
            &name=video.bitrate&value={bitrate}&replace=true)\
            +add-limitation(scope=videoCodec&scopeName=*&type=upperBound\
            &name=video.height&value={height}&replace=true)\
            +append-transcode-target-codec(type=videoProfile&context=streaming\
            &videoCodec=h264&audioCodec=aac&protocol=hls)"
        );

        let media_path = format!("/library/metadata/{}", id);
        let transcode_params: Vec<(&str, &str)> = vec![
            ("hasMDE", "1"),
            ("path", &media_path),
            ("mediaIndex", "0"),
            ("partIndex", "0"),
            ("protocol", "hls"),
            ("fastSeek", "1"),
            ("directPlay", "0"),
            ("directStream", "0"),
            ("directStreamAudio", "0"),
            ("videoResolution", resolution),
            ("videoQuality", "100"),
            ("maxVideoBitrate", bitrate),
            ("autoAdjustQuality", "0"),
            ("subtitleSize", "100"),
            ("audioBoost", "100"),
            ("mediaBufferSize", "102400"),
            ("location", "lan"),
            ("session", &session),
            ("X-Plex-Client-Profile-Extra", &profile_extra),
            ("X-Plex-Token", &token),
            ("X-Plex-Client-Identifier", &client_id),
            ("X-Plex-Product", "Playarr"),
            ("X-Plex-Platform", "Chrome"),
        ];

        // Step 1: Call the decision endpoint to update the transcode decision.
        // Plex caches transcode decisions per client identifier; without this
        // call, start.m3u8 reuses the old quality settings.
        let decision_url = format!(
            "{}/video/:/transcode/universal/decision",
            base_url
        );
        let _ = plex.http
            .get(&decision_url)
            .query(&transcode_params)
            .header("Accept", "application/json")
            .send()
            .await;

        // Step 2: Request the HLS manifest — Plex now uses the updated decision
        let start_url = format!(
            "{}/video/:/transcode/universal/start.m3u8",
            base_url
        );
        let resp = plex.http
            .get(&start_url)
            .query(&transcode_params)
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

        // Proxy through backend so local Plex IP is never exposed to clients
        let stream_url = if session_path.starts_with("http") {
            session_path.replace(
                &format!("{}/video/:/transcode/universal/", base_url),
                "/api/media/transcode/",
            )
        } else {
            format!("/api/media/transcode/{}", session_path)
        };

        Ok(HttpResponse::Ok().json(serde_json::json!({
            "url": stream_url,
            "type": "hls",
            "media": media,
            "part": part
        })))
    }
}

#[get("/{id}/bif")]
async fn get_bif(
    plex: web::Data<PlexClient>,
    path: web::Path<String>,
) -> Result<impl Responder> {
    let id = path.into_inner();

    let req = plex.get(&format!("/library/metadata/{}", id))?;
    let body = plex.send_json(req).await?;

    let part_id = body["MediaContainer"]["Metadata"][0]["Media"][0]["Part"][0]["id"]
        .as_i64()
        .ok_or_else(|| anyhow::anyhow!("No part ID found for media {}", id))?;

    let bif_path = format!("/library/parts/{}/indexes/sd", part_id);
    let req = plex.get_image(&bif_path)?;
    let resp = req.send().await
        .map_err(|e| anyhow::anyhow!("BIF request failed: {}", e))?;

    if !resp.status().is_success() {
        return Ok(HttpResponse::NotFound().finish());
    }

    let bytes = resp.bytes().await
        .map_err(|e| anyhow::anyhow!("Failed to read BIF data: {}", e))?;

    Ok(HttpResponse::Ok()
        .content_type("application/octet-stream")
        .append_header(("Cache-Control", "public, max-age=86400"))
        .body(bytes))
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

/// Proxy direct-play streams from Plex, with HTTP range request support.
/// This prevents the local Plex server IP from being exposed to remote clients.
#[get("/stream-proxy/{path:.*}")]
async fn stream_proxy(
    req: HttpRequest,
    plex: web::Data<PlexClient>,
    path: web::Path<String>,
) -> Result<HttpResponse> {
    let plex_path = format!("/{}", path.into_inner());

    // Only allow proxying library paths
    if !plex_path.starts_with("/library/") {
        return Err(anyhow::anyhow!("Invalid proxy path").into());
    }

    let mut plex_req = plex.get_image(&plex_path)?;

    // Forward Range header for seeking support
    if let Some(range) = req.headers().get("Range") {
        if let Ok(range_str) = range.to_str() {
            plex_req = plex_req.header("Range", range_str);
        }
    }

    let resp = plex_req.send().await
        .map_err(|e| anyhow::anyhow!("Plex stream proxy failed: {}", e))?;

    let status = resp.status();
    let mut builder = if status == reqwest::StatusCode::PARTIAL_CONTENT {
        HttpResponse::PartialContent()
    } else if status.is_success() {
        HttpResponse::Ok()
    } else {
        return Err(anyhow::anyhow!("Plex returned {}", status.as_u16()).into());
    };

    // Forward relevant headers
    for name in ["content-type", "content-length", "content-range", "accept-ranges"] {
        if let Some(val) = resp.headers().get(name) {
            if let Ok(val_str) = val.to_str() {
                builder.insert_header((name, val_str.to_string()));
            }
        }
    }

    let bytes = resp.bytes().await
        .map_err(|e| anyhow::anyhow!("Failed to read stream data: {}", e))?;

    Ok(builder.body(bytes))
}

/// Proxy HLS transcode/directstream requests to Plex.
/// Rewrites absolute Plex URLs in m3u8 playlists to use the proxy,
/// and forwards video segments transparently.
#[get("/transcode/{path:.*}")]
async fn transcode_proxy(
    req: HttpRequest,
    plex: web::Data<PlexClient>,
    path: web::Path<String>,
) -> Result<HttpResponse> {
    let plex_path = path.into_inner();
    let cfg = plex.config.read().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
    let base_url = cfg.plex.url.trim_end_matches('/').to_string();
    let token = cfg.plex.token.clone();
    let client_id = cfg.plex.client_id.clone();
    drop(cfg);

    let mut url = format!("{}/video/:/transcode/universal/{}", base_url, plex_path);

    // Forward query string if present (some segment requests may include params)
    if let Some(query) = req.uri().query() {
        url.push('?');
        url.push_str(query);
    }

    let resp = plex.http
        .get(&url)
        .header("X-Plex-Token", &token)
        .header("X-Plex-Client-Identifier", &client_id)
        .header("X-Plex-Product", "Playarr")
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Transcode proxy failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        return Err(anyhow::anyhow!("Plex transcode returned {}", status.as_u16()).into());
    }

    let content_type = resp.headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("application/octet-stream")
        .to_string();

    if content_type.contains("mpegurl") || plex_path.ends_with(".m3u8") {
        // For m3u8 playlists, rewrite any absolute Plex URLs to use our proxy
        let body = resp.text().await
            .map_err(|e| anyhow::anyhow!("Failed to read m3u8: {}", e))?;

        let rewritten = body.replace(
            &format!("{}/video/:/transcode/universal/", base_url),
            "/api/media/transcode/",
        );

        Ok(HttpResponse::Ok()
            .content_type("application/vnd.apple.mpegurl")
            .body(rewritten))
    } else {
        // For video segments, proxy the bytes directly
        let bytes = resp.bytes().await
            .map_err(|e| anyhow::anyhow!("Failed to read transcode data: {}", e))?;

        Ok(HttpResponse::Ok()
            .content_type(content_type)
            .body(bytes))
    }
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/media")
            .service(get_image)
            .service(stream_proxy)
            .service(transcode_proxy)
            .service(get_stream_url)
            .service(get_bif)
            .service(get_thumb)
            .service(get_art)
            .service(get_children)
            .service(get_related)
            .service(get_metadata),
    );
}
