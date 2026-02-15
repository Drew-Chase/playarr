use actix_web::{get, web, HttpRequest, HttpResponse, Responder};
use crate::http_error::Result;
use crate::plex::client::PlexClient;

#[get("/continue-watching")]
async fn continue_watching(
    req: HttpRequest,
    plex: web::Data<PlexClient>,
) -> Result<impl Responder> {
    let user_token = PlexClient::user_token_from_request(&req).unwrap_or_default();
    let request = plex
        .get_as_user("/hubs/continueWatching", &user_token)?
        .query(&[("X-Plex-Container-Size", "20")]);
    let body = plex.send_json(request).await?;

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
    let request = plex
        .get_as_user("/library/onDeck", &user_token)?
        .query(&[("X-Plex-Container-Size", "20")]);
    let body = plex.send_json(request).await?;
    Ok(HttpResponse::Ok().json(&body["MediaContainer"]["Metadata"]))
}

#[get("/recently-added")]
async fn recently_added(
    req: HttpRequest,
    plex: web::Data<PlexClient>,
) -> Result<impl Responder> {
    let user_token = PlexClient::user_token_from_request(&req).unwrap_or_default();
    let request = plex
        .get_as_user("/library/recentlyAdded", &user_token)?
        .query(&[("X-Plex-Container-Size", "20")]);
    let body = plex.send_json(request).await?;
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
