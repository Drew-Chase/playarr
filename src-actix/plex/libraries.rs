use actix_web::{get, web, HttpResponse, Responder};
use rand::seq::SliceRandom;
use serde::Deserialize;
use crate::http_error::Result;
use crate::plex::client::PlexClient;

#[get("")]
async fn list_libraries(
    plex: web::Data<PlexClient>,
) -> Result<impl Responder> {
    let req = plex.get("/library/sections")?;
    let body = plex.send_json(req).await?;
    Ok(HttpResponse::Ok().json(&body["MediaContainer"]["Directory"]))
}

#[derive(Deserialize)]
struct LibraryItemsQuery {
    start: Option<u32>,
    size: Option<u32>,
    sort: Option<String>,
}

#[get("/{key}/items")]
async fn library_items(
    plex: web::Data<PlexClient>,
    path: web::Path<String>,
    query: web::Query<LibraryItemsQuery>,
) -> Result<impl Responder> {
    let key = path.into_inner();
    let start = query.start.unwrap_or(0);
    let size = query.size.unwrap_or(50);

    let mut req = plex.get(&format!("/library/sections/{}/all", key))?;
    req = req.query(&[
        ("X-Plex-Container-Start", start.to_string()),
        ("X-Plex-Container-Size", size.to_string()),
    ]);

    if let Some(ref sort) = query.sort {
        req = req.query(&[("sort", sort.as_str())]);
    }

    let body = plex.send_json(req).await?;

    let container = &body["MediaContainer"];
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "items": container["Metadata"],
        "totalSize": container["totalSize"],
        "offset": container["offset"],
        "size": container["size"]
    })))
}

#[get("/{key}/recent")]
async fn library_recent(
    plex: web::Data<PlexClient>,
    path: web::Path<String>,
) -> Result<impl Responder> {
    let key = path.into_inner();
    let req = plex
        .get(&format!("/library/sections/{}/recentlyAdded", key))?
        .query(&[("X-Plex-Container-Size", "20")]);
    let body = plex.send_json(req).await?;
    Ok(HttpResponse::Ok().json(&body["MediaContainer"]["Metadata"]))
}

#[get("/{key}/folders")]
async fn library_folders(
    plex: web::Data<PlexClient>,
    path: web::Path<String>,
) -> Result<impl Responder> {
    let key = path.into_inner();
    let req = plex.get(&format!("/library/sections/{}/folder", key))?;
    let body = plex.send_json(req).await?;
    Ok(HttpResponse::Ok().json(&body["MediaContainer"]["Metadata"]))
}

#[get("/{key}/genres")]
async fn library_genres(
    plex: web::Data<PlexClient>,
    path: web::Path<String>,
) -> Result<impl Responder> {
    let key = path.into_inner();
    let req = plex.get(&format!("/library/sections/{}/genre", key))?;
    let body = plex.send_json(req).await?;
    Ok(HttpResponse::Ok().json(&body["MediaContainer"]["Directory"]))
}

#[derive(Deserialize)]
struct ByGenreQuery {
    genres: String,
    size: Option<u32>,
}

/// Return items for multiple genres in a single request.
/// Query: `?genres=Action,Comedy,Drama&size=20`
#[get("/{key}/by-genre")]
async fn library_by_genre(
    plex: web::Data<PlexClient>,
    path: web::Path<String>,
    query: web::Query<ByGenreQuery>,
) -> Result<impl Responder> {
    let key = path.into_inner();
    let size = query.size.unwrap_or(20).min(50) as usize;
    // Fetch extra items so we can shuffle and still return enough variety
    let fetch_size = (size * 3).min(150).to_string();
    let genre_names: Vec<&str> = query.genres.split(',').take(4).collect();

    let futures: Vec<_> = genre_names.iter().map(|genre| {
        let plex = plex.clone();
        let key = key.clone();
        let fetch_size = fetch_size.clone();
        let size = size;
        let genre = genre.to_string();
        async move {
            let req = match plex.get(&format!("/library/sections/{}/all", key)) {
                Ok(r) => r.query(&[
                    ("genre", genre.as_str()),
                    ("sort", "addedAt:desc"),
                    ("X-Plex-Container-Size", &fetch_size),
                ]),
                Err(_) => return None,
            };
            match plex.send_json(req).await {
                Ok(body) => {
                    let items = &body["MediaContainer"]["Metadata"];
                    if let Some(arr) = items.as_array() {
                        let mut shuffled = arr.clone();
                        shuffled.shuffle(&mut rand::rng());
                        shuffled.truncate(size);
                        Some(serde_json::json!({
                            "genre": genre,
                            "items": shuffled
                        }))
                    } else {
                        None
                    }
                }
                Err(_) => None,
            }
        }
    }).collect();

    let results = futures_util::future::join_all(futures).await;
    let groups: Vec<_> = results.into_iter().flatten().collect();

    Ok(HttpResponse::Ok().json(groups))
}

#[get("/{key}/collections")]
async fn library_collections(
    plex: web::Data<PlexClient>,
    path: web::Path<String>,
) -> Result<impl Responder> {
    let key = path.into_inner();
    let req = plex.get(&format!("/library/sections/{}/collections", key))?;
    let body = plex.send_json(req).await?;
    let items = &body["MediaContainer"]["Metadata"];
    if items.is_null() {
        Ok(HttpResponse::Ok().json(serde_json::json!([])))
    } else {
        Ok(HttpResponse::Ok().json(items))
    }
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/libraries")
            .service(list_libraries)
            .service(library_items)
            .service(library_recent)
            .service(library_genres)
            .service(library_by_genre)
            .service(library_folders)
            .service(library_collections),
    );
}
