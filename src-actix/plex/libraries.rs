use actix_web::{get, web, HttpResponse, Responder};
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

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/libraries")
            .service(list_libraries)
            .service(library_items)
            .service(library_recent)
            .service(library_folders),
    );
}
