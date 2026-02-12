use actix_web::{get, web, HttpResponse, Responder};
use serde::Deserialize;
use crate::http_error::Result;
use crate::plex::client::PlexClient;

#[derive(Deserialize)]
struct SearchQuery {
    q: String,
}

#[get("")]
async fn search(
    plex: web::Data<PlexClient>,
    query: web::Query<SearchQuery>,
) -> Result<impl Responder> {
    let req = plex
        .get("/hubs/search")?
        .query(&[
            ("query", query.q.as_str()),
            ("limit", "20"),
            ("includeCollections", "1"),
        ]);
    let body = plex.send_json(req).await?;
    Ok(HttpResponse::Ok().json(&body["MediaContainer"]["Hub"]))
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(web::scope("/search").service(search));
}
