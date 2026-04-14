use crate::http_error::Result;
use crate::plex::client::PlexClient;
use actix_web::{get, web, HttpRequest, HttpResponse, Responder};
use log::{debug, warn};
use serde::Deserialize;
use std::collections::HashSet;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Deserialize)]
struct RecommendationParams {
    count: Option<u32>,
    limit: Option<u32>,
}

/// Background-refreshed cache for slow hub endpoints.
/// Populated every 120 seconds by a background task so requests are instant.
pub struct HubCache {
    recently_aired: RwLock<Vec<serde_json::Value>>,
    recently_released: RwLock<Vec<serde_json::Value>>,
}

impl HubCache {
    pub fn new() -> Self {
        Self {
            recently_aired: RwLock::new(Vec::new()),
            recently_released: RwLock::new(Vec::new()),
        }
    }

    /// Refresh the recently-aired episodes cache by querying Plex.
    async fn refresh_recently_aired(&self, plex: &PlexClient) {
        let token = plex.token();
        if token.is_empty() {
            return;
        }

        let sections_body = match plex
            .get_json_as_user("/library/sections", &token, &[])
            .await
        {
            Ok(body) => body,
            Err(e) => {
                warn!("HubCache: failed to fetch sections for recently-aired: {}", e);
                return;
            }
        };

        let show_section_keys: Vec<String> = sections_body["MediaContainer"]["Directory"]
            .as_array()
            .unwrap_or(&Vec::new())
            .iter()
            .filter(|s| s["type"].as_str() == Some("show"))
            .filter_map(|s| s["key"].as_str().map(|k| k.to_string()))
            .collect();

        if show_section_keys.is_empty() {
            *self.recently_aired.write().await = Vec::new();
            return;
        }

        let futures: Vec<_> = show_section_keys
            .iter()
            .map(|key| {
                let plex_token = token.clone();
                let path = format!("/library/sections/{}/all", key);
                async move {
                    plex.get_json_as_user(
                        &path,
                        &plex_token,
                        &[
                            ("type", "4"),
                            ("sort", "originallyAvailableAt:desc"),
                            ("X-Plex-Container-Size", "20"),
                        ],
                    )
                    .await
                }
            })
            .collect();

        let results = futures_util::future::join_all(futures).await;

        let mut all_episodes: Vec<serde_json::Value> = Vec::new();
        for body in results.into_iter().flatten() {
            if let Some(arr) = body["MediaContainer"]["Metadata"].as_array() {
                all_episodes.extend(arr.iter().cloned());
            }
        }

        all_episodes.sort_by(|a, b| {
            let date_a = a["originallyAvailableAt"].as_str().unwrap_or("");
            let date_b = b["originallyAvailableAt"].as_str().unwrap_or("");
            date_b.cmp(date_a)
        });
        all_episodes.truncate(20);

        debug!("HubCache: refreshed recently-aired with {} episodes", all_episodes.len());
        *self.recently_aired.write().await = all_episodes;
    }

    /// Refresh the recently-released movies cache by querying Plex.
    async fn refresh_recently_released(&self, plex: &PlexClient) {
        let token = plex.token();
        if token.is_empty() {
            return;
        }

        let sections_body = match plex
            .get_json_as_user("/library/sections", &token, &[])
            .await
        {
            Ok(body) => body,
            Err(e) => {
                warn!("HubCache: failed to fetch sections for recently-released: {}", e);
                return;
            }
        };

        let movie_section_keys: Vec<String> = sections_body["MediaContainer"]["Directory"]
            .as_array()
            .unwrap_or(&Vec::new())
            .iter()
            .filter(|s| s["type"].as_str() == Some("movie"))
            .filter_map(|s| s["key"].as_str().map(|k| k.to_string()))
            .collect();

        if movie_section_keys.is_empty() {
            *self.recently_released.write().await = Vec::new();
            return;
        }

        let futures: Vec<_> = movie_section_keys
            .iter()
            .map(|key| {
                let plex_token = token.clone();
                let path = format!("/library/sections/{}/all", key);
                async move {
                    plex.get_json_as_user(
                        &path,
                        &plex_token,
                        &[
                            ("type", "1"),
                            ("sort", "originallyAvailableAt:desc"),
                            ("X-Plex-Container-Size", "20"),
                        ],
                    )
                    .await
                }
            })
            .collect();

        let results = futures_util::future::join_all(futures).await;

        let mut all_movies: Vec<serde_json::Value> = Vec::new();
        for body in results.into_iter().flatten() {
            if let Some(arr) = body["MediaContainer"]["Metadata"].as_array() {
                all_movies.extend(arr.iter().cloned());
            }
        }

        all_movies.sort_by(|a, b| {
            let date_a = a["originallyAvailableAt"].as_str().unwrap_or("");
            let date_b = b["originallyAvailableAt"].as_str().unwrap_or("");
            date_b.cmp(date_a)
        });
        all_movies.truncate(20);

        debug!("HubCache: refreshed recently-released with {} movies", all_movies.len());
        *self.recently_released.write().await = all_movies;
    }

    /// Refresh all cached data.
    pub async fn refresh_all(&self, plex: &PlexClient) {
        futures_util::future::join(
            self.refresh_recently_aired(plex),
            self.refresh_recently_released(plex),
        )
        .await;
    }
}

pub type SharedHubCache = Arc<HubCache>;

#[get("/continue-watching")]
async fn continue_watching(
    req: HttpRequest,
    plex: web::Data<PlexClient>,
) -> Result<impl Responder> {
    let user_token = PlexClient::user_token_from_request(&req).unwrap_or_default();
    let body = plex
        .get_json_as_user(
            "/hubs/continueWatching",
            &user_token,
            &[("X-Plex-Container-Size", "20")],
        )
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
async fn on_deck(req: HttpRequest, plex: web::Data<PlexClient>) -> Result<impl Responder> {
    let user_token = PlexClient::user_token_from_request(&req).unwrap_or_default();
    let body = plex
        .get_json_as_user(
            "/library/onDeck",
            &user_token,
            &[("X-Plex-Container-Size", "20")],
        )
        .await?;
    Ok(HttpResponse::Ok().json(&body["MediaContainer"]["Metadata"]))
}

#[get("/recently-added")]
async fn recently_added(req: HttpRequest, plex: web::Data<PlexClient>) -> Result<impl Responder> {
    let user_token = PlexClient::user_token_from_request(&req).unwrap_or_default();
    let body = plex
        .get_json_as_user(
            "/library/recentlyAdded",
            &user_token,
            &[("X-Plex-Container-Size", "20")],
        )
        .await?;
    Ok(HttpResponse::Ok().json(&body["MediaContainer"]["Metadata"]))
}

#[get("/recently-aired")]
async fn recently_aired(cache: web::Data<SharedHubCache>) -> Result<impl Responder> {
    let episodes = cache.recently_aired.read().await;
    Ok(HttpResponse::Ok().json(&*episodes))
}

#[get("/recently-released-movies")]
async fn recently_released_movies(cache: web::Data<SharedHubCache>) -> Result<impl Responder> {
    let movies = cache.recently_released.read().await;
    Ok(HttpResponse::Ok().json(&*movies))
}

/// Build "Because You Watched X" recommendations from the user's watch history.
/// Fetches similar items for up to `count` sources and returns up to `limit` items per row.
///
/// Query params:
/// - `count` — max number of recommendation rows (default 5)
/// - `limit` — max items per row (default 20)
#[get("/recommendations")]
async fn recommendations(
    req: HttpRequest,
    plex: web::Data<PlexClient>,
    query: web::Query<RecommendationParams>,
) -> Result<impl Responder> {
    let user_token = PlexClient::user_token_from_request(&req).unwrap_or_default();
    let max_rows = query.count.unwrap_or(5).min(20) as usize;
    let items_per_row = query.limit.unwrap_or(20).min(50) as usize;

    // Fetch multiple sources of watch history concurrently
    let (cw_result, od_result, rv_result) = futures_util::future::join3(
        plex.get_json_as_user(
            "/hubs/continueWatching",
            &user_token,
            &[("X-Plex-Container-Size", "30")],
        ),
        plex.get_json_as_user(
            "/library/onDeck",
            &user_token,
            &[("X-Plex-Container-Size", "30")],
        ),
        plex.get_json_as_user(
            "/library/recentlyViewed",
            &user_token,
            &[("X-Plex-Container-Size", "50")],
        ),
    )
    .await;

    // Collect all items from all sources
    let mut all_items: Vec<serde_json::Value> = Vec::new();

    if let Ok(ref body) = cw_result {
        let hubs = &body["MediaContainer"]["Hub"];
        if let Some(arr) = hubs
            .as_array()
            .and_then(|a| a.first())
            .and_then(|hub| hub["Metadata"].as_array())
        {
            all_items.extend(arr.iter().cloned());
        }
    }
    if let Ok(ref body) = od_result
        && let Some(arr) = body["MediaContainer"]["Metadata"].as_array()
    {
        all_items.extend(arr.iter().cloned());
    }
    if let Ok(ref body) = rv_result
        && let Some(arr) = body["MediaContainer"]["Metadata"].as_array()
    {
        all_items.extend(arr.iter().cloned());
    }

    if all_items.is_empty() {
        return Ok(HttpResponse::Ok().json(serde_json::json!([])));
    }

    // Collect unique sources (movies and shows), deduplicated, up to max_rows total
    let mut all_sources: Vec<(String, String)> = Vec::new();
    let mut seen = HashSet::new();

    for item in &all_items {
        if all_sources.len() >= max_rows {
            break;
        }
        let item_type = item["type"].as_str().unwrap_or("");
        let (id, title) = match item_type {
            "movie" => (
                item["ratingKey"].as_str().unwrap_or("").to_string(),
                item["title"].as_str().unwrap_or("Unknown").to_string(),
            ),
            "episode" => (
                item["grandparentRatingKey"]
                    .as_str()
                    .unwrap_or("")
                    .to_string(),
                item["grandparentTitle"]
                    .as_str()
                    .unwrap_or("Unknown")
                    .to_string(),
            ),
            "show" => (
                item["ratingKey"].as_str().unwrap_or("").to_string(),
                item["title"].as_str().unwrap_or("Unknown").to_string(),
            ),
            _ => continue,
        };
        if !id.is_empty() && seen.insert(id.clone()) {
            all_sources.push((id, title));
        }
    }

    let container_size = items_per_row.to_string();
    let futures: Vec<_> = all_sources
        .iter()
        .map(|(id, title)| {
            let plex = plex.clone();
            let id = id.clone();
            let title = title.clone();
            let container_size = container_size.clone();
            async move {
                let req = match plex.get(&format!("/library/metadata/{}/similar", id)) {
                    Ok(r) => r.query(&[("X-Plex-Container-Size", &container_size)]),
                    Err(_) => return None,
                };
                let body = match plex.send_json(req).await {
                    Ok(b) => b,
                    Err(_) => return None,
                };
                let metadata = &body["MediaContainer"]["Metadata"];
                if let Some(arr) = metadata.as_array()
                    && !arr.is_empty()
                {
                    return Some(serde_json::json!({
                        "title": format!("Because You Watched {}", title),
                        "items": arr
                    }));
                }
                None
            }
        })
        .collect();

    let results = futures_util::future::join_all(futures).await;
    let recommendations: Vec<_> = results.into_iter().flatten().collect();

    Ok(HttpResponse::Ok().json(recommendations))
}

#[get("/playlists")]
async fn playlists(req: HttpRequest, plex: web::Data<PlexClient>) -> Result<impl Responder> {
    let user_token = PlexClient::user_token_from_request(&req).unwrap_or_default();
    let body = plex
        .get_json_as_user(
            "/playlists",
            &user_token,
            &[("playlistType", "video"), ("X-Plex-Container-Size", "50")],
        )
        .await?;
    let items = &body["MediaContainer"]["Metadata"];
    if items.is_null() {
        Ok(HttpResponse::Ok().json(serde_json::json!([])))
    } else {
        Ok(HttpResponse::Ok().json(items))
    }
}

#[get("/playlists/{id}")]
async fn playlist_metadata(
    req: HttpRequest,
    plex: web::Data<PlexClient>,
    path: web::Path<String>,
) -> Result<impl Responder> {
    let id = path.into_inner();
    let user_token = PlexClient::user_token_from_request(&req).unwrap_or_default();
    let body = plex
        .get_json_as_user(&format!("/playlists/{}", id), &user_token, &[])
        .await?;
    let metadata = &body["MediaContainer"]["Metadata"];
    let item = metadata.get(0).unwrap_or(metadata);
    Ok(HttpResponse::Ok().json(item))
}

#[get("/playlists/{id}/items")]
async fn playlist_items(
    req: HttpRequest,
    plex: web::Data<PlexClient>,
    path: web::Path<String>,
) -> Result<impl Responder> {
    let id = path.into_inner();
    let user_token = PlexClient::user_token_from_request(&req).unwrap_or_default();
    let body = plex
        .get_json_as_user(&format!("/playlists/{}/items", id), &user_token, &[])
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
            .service(recently_aired)
            .service(recently_released_movies)
            .service(recommendations)
            .service(playlist_metadata)
            .service(playlist_items)
            .service(playlists),
    );
}
