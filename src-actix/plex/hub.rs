use actix_web::{get, web, HttpRequest, HttpResponse, Responder};
use std::collections::HashSet;
use crate::http_error::Result;
use crate::plex::client::PlexClient;

#[get("/continue-watching")]
async fn continue_watching(
    req: HttpRequest,
    plex: web::Data<PlexClient>,
) -> Result<impl Responder> {
    let user_token = PlexClient::user_token_from_request(&req).unwrap_or_default();
    let body = plex
        .get_json_as_user("/hubs/continueWatching", &user_token, &[("X-Plex-Container-Size", "20")])
        .await?;

    // Extract from Hub container
    let hubs = &body["MediaContainer"]["Hub"];
    if let Some(hub) = hubs.as_array().and_then(|a| a.first()) {
        Ok(HttpResponse::Ok().json(&hub["Metadata"]))
    } else {
        Ok(HttpResponse::Ok().json(serde_json::json!([])))
    }
}

#[get("/on-deck")]
async fn on_deck(
    req: HttpRequest,
    plex: web::Data<PlexClient>,
) -> Result<impl Responder> {
    let user_token = PlexClient::user_token_from_request(&req).unwrap_or_default();
    let body = plex
        .get_json_as_user("/library/onDeck", &user_token, &[("X-Plex-Container-Size", "20")])
        .await?;
    Ok(HttpResponse::Ok().json(&body["MediaContainer"]["Metadata"]))
}

#[get("/recently-added")]
async fn recently_added(
    req: HttpRequest,
    plex: web::Data<PlexClient>,
) -> Result<impl Responder> {
    let user_token = PlexClient::user_token_from_request(&req).unwrap_or_default();
    let body = plex
        .get_json_as_user("/library/recentlyAdded", &user_token, &[("X-Plex-Container-Size", "20")])
        .await?;
    Ok(HttpResponse::Ok().json(&body["MediaContainer"]["Metadata"]))
}

/// Build "Because You Watched X" recommendations from the user's continue-watching list.
/// Fetches similar items for up to 3 recently watched titles concurrently.
#[get("/recommendations")]
async fn recommendations(
    req: HttpRequest,
    plex: web::Data<PlexClient>,
) -> Result<impl Responder> {
    let user_token = PlexClient::user_token_from_request(&req).unwrap_or_default();

    // Fetch continue-watching hub for this user
    let cw_body = plex
        .get_json_as_user("/hubs/continueWatching", &user_token, &[("X-Plex-Container-Size", "20")])
        .await;

    let items = match cw_body {
        Ok(ref body) => {
            let hubs = &body["MediaContainer"]["Hub"];
            hubs.as_array()
                .and_then(|a| a.first())
                .and_then(|hub| hub["Metadata"].as_array())
                .cloned()
                .unwrap_or_default()
        }
        Err(_) => vec![],
    };

    if items.is_empty() {
        return Ok(HttpResponse::Ok().json(serde_json::json!([])));
    }

    // Extract up to 3 unique source items (deduplicate shows by grandparentRatingKey)
    let mut sources: Vec<(String, String)> = Vec::new(); // (ratingKey for similar, display title)
    let mut seen = HashSet::new();
    for item in &items {
        if sources.len() >= 3 { break; }
        let item_type = item["type"].as_str().unwrap_or("");
        let (source_id, title) = if item_type == "episode" {
            let gid = item["grandparentRatingKey"].as_str().unwrap_or("");
            let gtitle = item["grandparentTitle"].as_str().unwrap_or("Unknown");
            (gid.to_string(), gtitle.to_string())
        } else {
            let id = item["ratingKey"].as_str().unwrap_or("");
            let t = item["title"].as_str().unwrap_or("Unknown");
            (id.to_string(), t.to_string())
        };
        if !source_id.is_empty() && seen.insert(source_id.clone()) {
            sources.push((source_id, title));
        }
    }

    // Fetch similar items concurrently for each source
    let futures: Vec<_> = sources.iter().map(|(id, title)| {
        let plex = plex.clone();
        let id = id.clone();
        let title = title.clone();
        async move {
            let req = match plex.get(&format!("/library/metadata/{}/similar", id)) {
                Ok(r) => r.query(&[("X-Plex-Container-Size", "15")]),
                Err(_) => return None,
            };
            let body = match plex.send_json(req).await {
                Ok(b) => b,
                Err(_) => return None,
            };
            let metadata = &body["MediaContainer"]["Metadata"];
            if let Some(arr) = metadata.as_array() {
                if !arr.is_empty() {
                    return Some(serde_json::json!({
                        "title": format!("Because You Watched {}", title),
                        "items": arr
                    }));
                }
            }
            None
        }
    }).collect();

    let results = futures_util::future::join_all(futures).await;
    let recommendations: Vec<_> = results.into_iter().flatten().collect();

    Ok(HttpResponse::Ok().json(recommendations))
}

#[get("/playlists")]
async fn playlists(
    req: HttpRequest,
    plex: web::Data<PlexClient>,
) -> Result<impl Responder> {
    let user_token = PlexClient::user_token_from_request(&req).unwrap_or_default();
    let body = plex
        .get_json_as_user("/playlists", &user_token, &[
            ("playlistType", "video"),
            ("X-Plex-Container-Size", "50"),
        ])
        .await?;
    let items = &body["MediaContainer"]["Metadata"];
    if items.is_null() {
        Ok(HttpResponse::Ok().json(serde_json::json!([])))
    } else {
        Ok(HttpResponse::Ok().json(items))
    }
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/hubs")
            .service(continue_watching)
            .service(on_deck)
            .service(recently_added)
            .service(recommendations)
            .service(playlists),
    );
}
