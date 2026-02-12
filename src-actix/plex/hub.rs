use actix_web::{get, web, HttpResponse, Responder};
use crate::http_error::Result;
use crate::plex::client::PlexClient;

#[get("/continue-watching")]
async fn continue_watching(
    plex: web::Data<PlexClient>,
) -> Result<impl Responder> {
    let req = plex
        .get("/hubs/continueWatching")?
        .query(&[("X-Plex-Container-Size", "20")]);
    let body = plex.send_json(req).await?;

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
    plex: web::Data<PlexClient>,
) -> Result<impl Responder> {
    let req = plex
        .get("/library/onDeck")?
        .query(&[("X-Plex-Container-Size", "20")]);
    let body = plex.send_json(req).await?;
    Ok(HttpResponse::Ok().json(&body["MediaContainer"]["Metadata"]))
}

#[get("/recently-added")]
async fn recently_added(
    plex: web::Data<PlexClient>,
) -> Result<impl Responder> {
    let req = plex
        .get("/library/recentlyAdded")?
        .query(&[("X-Plex-Container-Size", "20")]);
    let body = plex.send_json(req).await?;
    Ok(HttpResponse::Ok().json(&body["MediaContainer"]["Metadata"]))
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/hubs")
            .service(continue_watching)
            .service(on_deck)
            .service(recently_added),
    );
}
