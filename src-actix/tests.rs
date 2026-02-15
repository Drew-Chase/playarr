use actix_web::{web, App, test};
use serde_json::{json, Value};
use std::sync::{Arc, RwLock};
use wiremock::{Mock, MockServer, ResponseTemplate};
use wiremock::matchers::{method, path, query_param};

use crate::config::models::*;
use crate::config::SharedConfig;
use crate::plex::client::PlexClient;
use crate::sonarr::client::SonarrClient;
use crate::radarr::client::RadarrClient;
use crate::watch_party::room::RoomManager;

fn mock_config(plex_url: &str, plex_token: &str) -> SharedConfig {
    Arc::new(RwLock::new(AppConfig {
        plex: PlexConfig {
            url: plex_url.to_string(),
            token: plex_token.to_string(),
            client_id: "test-client-id".to_string(),
            admin_user_id: 0,
        },
        sonarr: SonarrConfig::default(),
        radarr: RadarrConfig::default(),
        download_clients: vec![],
    }))
}

fn full_mock_config(plex_url: &str, sonarr_url: &str, radarr_url: &str) -> SharedConfig {
    Arc::new(RwLock::new(AppConfig {
        plex: PlexConfig {
            url: plex_url.to_string(),
            token: "test-token-abc123".to_string(),
            client_id: "test-client-id".to_string(),
            admin_user_id: 0,
        },
        sonarr: SonarrConfig {
            url: sonarr_url.to_string(),
            api_key: "sonarr-key".to_string(),
        },
        radarr: RadarrConfig {
            url: radarr_url.to_string(),
            api_key: "radarr-key".to_string(),
        },
        download_clients: vec![],
    }))
}

/// Macro to build the test app inline so the compiler can infer all types.
macro_rules! test_app {
    ($config:expr) => {{
        let sc: SharedConfig = $config;
        let plex_client = web::Data::new(PlexClient::new(sc.clone()));
        let sonarr_client = web::Data::new(SonarrClient::new(sc.clone()));
        let radarr_client = web::Data::new(RadarrClient::new(sc.clone()));
        let room_manager = web::Data::new(RoomManager::new());
        let config_data = web::Data::new(sc);
        test::init_service(
            App::new()
                .app_data(config_data)
                .app_data(plex_client)
                .app_data(sonarr_client)
                .app_data(radarr_client)
                .app_data(room_manager)
                .service(
                    web::scope("/api")
                        .configure(crate::settings::endpoints::configure)
                        .configure(crate::auth::plex_auth::configure)
                        .configure(crate::plex::libraries::configure)
                        .configure(crate::plex::media::configure)
                        .configure(crate::plex::hub::configure)
                        .configure(crate::plex::search::configure)
                        .configure(crate::plex::timeline::configure)
                        .configure(|cfg: &mut web::ServiceConfig| {
                            cfg.service(
                                web::scope("/sonarr")
                                    .configure(crate::sonarr::series::configure)
                                    .configure(crate::sonarr::episodes::configure)
                                    .configure(crate::sonarr::calendar::configure)
                                    .configure(crate::sonarr::queue::configure),
                            );
                        })
                        .configure(|cfg: &mut web::ServiceConfig| {
                            cfg.service(
                                web::scope("/radarr")
                                    .configure(crate::radarr::movies::configure)
                                    .configure(crate::radarr::calendar::configure)
                                    .configure(crate::radarr::queue::configure),
                            );
                        })
                        .configure(crate::discover::tmdb::configure)
                        .configure(crate::downloads::configure)
                        .configure(crate::watch_party::configure),
                ),
        )
        .await
    }};
}

// ─── Settings ────────────────────────────────────────────────────────────────

#[actix_rt::test]
async fn settings_get_returns_redacted_config() {
    let config = mock_config("http://plex.local:32400", "secret-token");
    let app = test_app!(config);

    let req = test::TestRequest::get().uri("/api/settings").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body["plex"]["has_token"], true);
    assert_eq!(body["plex"]["url"], "http://plex.local:32400");
    // Token itself should NOT appear in redacted output
    assert!(body["plex"].get("token").is_none());
}

// Frontend sends {url, token: token || undefined} — when token input is empty,
// JS `"" || undefined` = `undefined`, which JSON.stringify drops entirely.
// So the real payload is just {"url": "..."} with NO token field.
#[actix_rt::test]
async fn settings_update_plex_frontend_save_url_only() {
    let config = mock_config("http://192.168.1.75:32400/", "valid-plex-auth-token");
    let app = test_app!(config.clone());

    // Exactly what the frontend sends: only the URL, no token field
    let req = test::TestRequest::put()
        .uri("/api/settings/plex")
        .set_json(json!({ "url": "http://192.168.1.75:32400/" }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let cfg = config.read().unwrap();
    assert_eq!(cfg.plex.url, "http://192.168.1.75:32400/");
    assert_eq!(cfg.plex.token, "valid-plex-auth-token", "Token must be preserved when not included in request");
}

// When the user explicitly types both URL and token in the settings form
#[actix_rt::test]
async fn settings_update_plex_with_url_and_token() {
    let config = mock_config("", "");
    let app = test_app!(config.clone());

    let req = test::TestRequest::put()
        .uri("/api/settings/plex")
        .set_json(json!({ "url": "http://192.168.1.75:32400/", "token": "manually-entered-token" }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let cfg = config.read().unwrap();
    assert_eq!(cfg.plex.url, "http://192.168.1.75:32400/");
    assert_eq!(cfg.plex.token, "manually-entered-token");
}

// Simulate the real bug scenario:
// 1. Token exists (from PIN auth)
// 2. User saves settings (URL only) — token must survive
// 3. Plex API call must use the surviving token (verified via header match)
#[actix_rt::test]
async fn settings_save_preserves_token_for_plex_api_calls() {
    let mock_server = MockServer::start().await;

    // Plex mock that REQUIRES the correct token as query parameter
    Mock::given(method("GET"))
        .and(path("/library/sections"))
        .and(query_param("X-Plex-Token", "my-secret-plex-token"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "MediaContainer": {
                "Directory": [
                    {"key": "1", "title": "Movies", "type": "movie"}
                ]
            }
        })))
        .mount(&mock_server).await;

    // Also mount a catch-all that returns 401 for wrong/missing token
    Mock::given(method("GET"))
        .and(path("/library/sections"))
        .respond_with(ResponseTemplate::new(401).set_body_string("Unauthorized"))
        .mount(&mock_server).await;

    let config = mock_config(&mock_server.uri(), "my-secret-plex-token");
    let app = test_app!(config.clone());

    // Step 1: Verify libraries work BEFORE settings save
    let req = test::TestRequest::get().uri("/api/libraries").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200, "Libraries should work before settings save");

    // Step 2: Save settings with URL only (no token) — mimics frontend
    let req = test::TestRequest::put()
        .uri("/api/settings/plex")
        .set_json(json!({ "url": mock_server.uri() }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    // Step 3: Verify token is still in config
    {
        let cfg = config.read().unwrap();
        assert_eq!(cfg.plex.token, "my-secret-plex-token", "Token must survive settings save");
    }

    // Step 4: Verify libraries STILL work AFTER settings save (token sent correctly)
    let req = test::TestRequest::get().uri("/api/libraries").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200, "Libraries must still work after settings save — token must be sent in X-Plex-Token header");
}

// Simulate PIN auth writing token, then settings save, then Plex API
#[actix_rt::test]
async fn pin_auth_then_settings_save_then_plex_api() {
    let mock_server = MockServer::start().await;

    // Plex mock requires the auth token as query parameter
    Mock::given(method("GET"))
        .and(path("/library/sections"))
        .and(query_param("X-Plex-Token", "token-from-pin-auth"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "MediaContainer": {
                "Directory": [{"key": "1", "title": "Movies", "type": "movie"}]
            }
        })))
        .mount(&mock_server).await;

    // 401 for wrong token
    Mock::given(method("GET"))
        .and(path("/library/sections"))
        .respond_with(ResponseTemplate::new(401).set_body_string("Unauthorized"))
        .mount(&mock_server).await;

    // Start with URL set but NO token (user hasn't authenticated yet)
    let config = mock_config(&mock_server.uri(), "");
    let app = test_app!(config.clone());

    // Step 1: Libraries should fail (no token)
    let req = test::TestRequest::get().uri("/api/libraries").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 401, "Should fail without token");

    // Step 2: Simulate what poll_pin does — write token directly to shared config
    {
        let mut cfg = config.write().unwrap();
        cfg.plex.token = "token-from-pin-auth".to_string();
    }

    // Step 3: Libraries should now work
    let req = test::TestRequest::get().uri("/api/libraries").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200, "Should work after PIN auth sets token");

    // Step 4: Frontend saves settings (URL only) — this is the bug scenario
    let req = test::TestRequest::put()
        .uri("/api/settings/plex")
        .set_json(json!({ "url": mock_server.uri() }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    // Step 5: Libraries must STILL work after settings save
    let req = test::TestRequest::get().uri("/api/libraries").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200, "BUG: Settings save wiped the auth token — libraries return 401 after saving URL");
}

#[actix_rt::test]
async fn settings_update_sonarr() {
    let config = mock_config("", "");
    let app = test_app!(config.clone());

    let req = test::TestRequest::put()
        .uri("/api/settings/sonarr")
        .set_json(json!({ "url": "http://sonarr:8989", "api_key": "test-key" }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let cfg = config.read().unwrap();
    assert_eq!(cfg.sonarr.url, "http://sonarr:8989");
    assert_eq!(cfg.sonarr.api_key, "test-key");
}

#[actix_rt::test]
async fn settings_update_radarr() {
    let config = mock_config("", "");
    let app = test_app!(config.clone());

    let req = test::TestRequest::put()
        .uri("/api/settings/radarr")
        .set_json(json!({ "url": "http://radarr:7878", "api_key": "radarr-key" }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let cfg = config.read().unwrap();
    assert_eq!(cfg.radarr.url, "http://radarr:7878");
}

#[actix_rt::test]
async fn settings_update_download_clients() {
    let config = mock_config("", "");
    let app = test_app!(config.clone());

    let req = test::TestRequest::put()
        .uri("/api/settings/download-clients")
        .set_json(json!([{
            "name": "SABnzbd", "type": "sabnzbd", "url": "http://sab:8080",
            "api_key": "sab-key", "username": "", "password": "", "enabled": true
        }]))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let cfg = config.read().unwrap();
    assert_eq!(cfg.download_clients.len(), 1);
    assert_eq!(cfg.download_clients[0].name, "SABnzbd");
}

#[actix_rt::test]
async fn settings_test_unknown_service_returns_400() {
    let app = test_app!(mock_config("", ""));

    let req = test::TestRequest::post().uri("/api/settings/test/unknown").set_json(json!({})).to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 400);

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body["success"], false);
}

#[actix_rt::test]
async fn settings_test_plex_unconfigured_returns_400() {
    let app = test_app!(mock_config("", ""));

    let req = test::TestRequest::post().uri("/api/settings/test/plex").set_json(json!({})).to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 400);

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body["success"], false);
    assert!(body["message"].as_str().unwrap().contains("not configured"));
}

// ─── Auth ────────────────────────────────────────────────────────────────────

#[actix_rt::test]
async fn auth_get_user_without_token_returns_401() {
    let app = test_app!(mock_config("http://plex.local:32400", ""));

    let req = test::TestRequest::get().uri("/api/auth/user").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 401);
}

#[actix_rt::test]
async fn auth_logout_clears_token() {
    let config = mock_config("http://plex.local:32400", "some-token");
    let app = test_app!(config.clone());

    let req = test::TestRequest::post().uri("/api/auth/logout").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body["success"], true);

    let cfg = config.read().unwrap();
    assert!(cfg.plex.token.is_empty());
}

// ─── Plex Libraries ─────────────────────────────────────────────────────────

#[actix_rt::test]
async fn libraries_without_token_returns_401() {
    let app = test_app!(mock_config("http://plex.local:32400", ""));

    let req = test::TestRequest::get().uri("/api/libraries").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 401);
}

#[actix_rt::test]
async fn libraries_without_url_returns_503() {
    let app = test_app!(mock_config("", "some-token"));

    let req = test::TestRequest::get().uri("/api/libraries").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 503);
}

#[actix_rt::test]
async fn libraries_returns_directory_array() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/library/sections"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "MediaContainer": {
                "Directory": [
                    {"key": "1", "title": "Movies", "type": "movie"},
                    {"key": "2", "title": "TV Shows", "type": "show"}
                ]
            }
        })))
        .mount(&mock_server).await;

    let app = test_app!(mock_config(&mock_server.uri(), "valid-token"));

    let req = test::TestRequest::get().uri("/api/libraries").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let body: Value = test::read_body_json(resp).await;
    let dirs = body.as_array().unwrap();
    assert_eq!(dirs.len(), 2);
    assert_eq!(dirs[0]["title"], "Movies");
    assert_eq!(dirs[1]["title"], "TV Shows");
}

#[actix_rt::test]
async fn library_items_returns_paginated() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/library/sections/1/all"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "MediaContainer": {
                "totalSize": 100, "offset": 0, "size": 2,
                "Metadata": [
                    {"ratingKey": "10", "title": "Movie A"},
                    {"ratingKey": "11", "title": "Movie B"}
                ]
            }
        })))
        .mount(&mock_server).await;

    let app = test_app!(mock_config(&mock_server.uri(), "valid-token"));

    let req = test::TestRequest::get()
        .uri("/api/libraries/1/items?start=0&size=2")
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body["totalSize"], 100);
    assert_eq!(body["items"].as_array().unwrap().len(), 2);
    assert_eq!(body["items"][0]["title"], "Movie A");
}

#[actix_rt::test]
async fn library_recent_returns_metadata() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/library/sections/1/recentlyAdded"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "MediaContainer": { "Metadata": [{"ratingKey": "99", "title": "Recent Movie"}] }
        })))
        .mount(&mock_server).await;

    let app = test_app!(mock_config(&mock_server.uri(), "valid-token"));

    let req = test::TestRequest::get().uri("/api/libraries/1/recent").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body.as_array().unwrap()[0]["title"], "Recent Movie");
}

#[actix_rt::test]
async fn library_folders_returns_metadata() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/library/sections/1/folder"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "MediaContainer": { "Metadata": [{"key": "/folder/1", "title": "Action"}] }
        })))
        .mount(&mock_server).await;

    let app = test_app!(mock_config(&mock_server.uri(), "valid-token"));

    let req = test::TestRequest::get().uri("/api/libraries/1/folders").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body.as_array().unwrap()[0]["title"], "Action");
}

// ─── Plex Media ──────────────────────────────────────────────────────────────

#[actix_rt::test]
async fn media_get_metadata() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/library/metadata/123"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "MediaContainer": { "Metadata": [{
                "ratingKey": "123", "title": "Test Movie", "year": 2024, "type": "movie"
            }] }
        })))
        .mount(&mock_server).await;

    let app = test_app!(mock_config(&mock_server.uri(), "valid-token"));

    let req = test::TestRequest::get().uri("/api/media/123").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body["title"], "Test Movie");
    assert_eq!(body["ratingKey"], "123");
}

#[actix_rt::test]
async fn media_get_children() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/library/metadata/200/children"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "MediaContainer": { "Metadata": [
                {"ratingKey": "201", "title": "Season 1", "index": 1},
                {"ratingKey": "202", "title": "Season 2", "index": 2}
            ] }
        })))
        .mount(&mock_server).await;

    let app = test_app!(mock_config(&mock_server.uri(), "valid-token"));

    let req = test::TestRequest::get().uri("/api/media/200/children").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body.as_array().unwrap().len(), 2);
    assert_eq!(body[0]["title"], "Season 1");
}

#[actix_rt::test]
async fn media_get_related() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/library/metadata/123/similar"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "MediaContainer": { "Metadata": [{"ratingKey": "456", "title": "Similar Movie"}] }
        })))
        .mount(&mock_server).await;

    let app = test_app!(mock_config(&mock_server.uri(), "valid-token"));

    let req = test::TestRequest::get().uri("/api/media/123/related").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body[0]["title"], "Similar Movie");
}

#[actix_rt::test]
async fn media_stream_direct_play() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/library/metadata/50"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "MediaContainer": { "Metadata": [{
                "ratingKey": "50",
                "Media": [{ "Part": [{"key": "/library/parts/50/file.mkv", "size": 1000000}], "videoCodec": "h264" }]
            }] }
        })))
        .mount(&mock_server).await;

    let app = test_app!(mock_config(&mock_server.uri(), "valid-token"));

    let req = test::TestRequest::get().uri("/api/media/50/stream?direct_play=true").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body["type"], "direct");
    assert!(body["url"].as_str().unwrap().contains("/library/parts/50/file.mkv"));
    assert!(body["url"].as_str().unwrap().contains("X-Plex-Token="));
}

#[actix_rt::test]
async fn media_stream_transcode() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/library/metadata/50"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "MediaContainer": { "Metadata": [{
                "ratingKey": "50",
                "Media": [{ "Part": [{"key": "/library/parts/50/file.mkv"}], "videoCodec": "h264" }]
            }] }
        })))
        .mount(&mock_server).await;

    let app = test_app!(mock_config(&mock_server.uri(), "valid-token"));

    let req = test::TestRequest::get()
        .uri("/api/media/50/stream?direct_play=false&quality=720p")
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body["type"], "hls");
    assert!(body["url"].as_str().unwrap().contains("start.m3u8"));
    assert!(body["url"].as_str().unwrap().contains("maxVideoBitrate=4000"));
}

// ─── Plex Hubs ───────────────────────────────────────────────────────────────

#[actix_rt::test]
async fn hubs_continue_watching() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/hubs/continueWatching"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "MediaContainer": { "Hub": [{
                "title": "Continue Watching",
                "Metadata": [{"ratingKey": "1", "title": "In Progress Movie"}]
            }] }
        })))
        .mount(&mock_server).await;

    let app = test_app!(mock_config(&mock_server.uri(), "valid-token"));

    let req = test::TestRequest::get().uri("/api/hubs/continue-watching").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body[0]["title"], "In Progress Movie");
}

#[actix_rt::test]
async fn hubs_continue_watching_empty() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/hubs/continueWatching"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "MediaContainer": { "Hub": [] }
        })))
        .mount(&mock_server).await;

    let app = test_app!(mock_config(&mock_server.uri(), "valid-token"));

    let req = test::TestRequest::get().uri("/api/hubs/continue-watching").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body, json!([]));
}

#[actix_rt::test]
async fn hubs_on_deck() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/library/onDeck"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "MediaContainer": { "Metadata": [{"ratingKey": "5", "title": "Next Episode"}] }
        })))
        .mount(&mock_server).await;

    let app = test_app!(mock_config(&mock_server.uri(), "valid-token"));

    let req = test::TestRequest::get().uri("/api/hubs/on-deck").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body[0]["title"], "Next Episode");
}

#[actix_rt::test]
async fn hubs_recently_added() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/library/recentlyAdded"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "MediaContainer": { "Metadata": [{"ratingKey": "99", "title": "Just Added"}] }
        })))
        .mount(&mock_server).await;

    let app = test_app!(mock_config(&mock_server.uri(), "valid-token"));

    let req = test::TestRequest::get().uri("/api/hubs/recently-added").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body[0]["title"], "Just Added");
}

// ─── Plex Search ─────────────────────────────────────────────────────────────

#[actix_rt::test]
async fn search_returns_hub_results() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/hubs/search"))
        .and(query_param("query", "batman"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "MediaContainer": { "Hub": [{
                "type": "movie", "title": "Movies",
                "Metadata": [{"title": "Batman Begins"}]
            }] }
        })))
        .mount(&mock_server).await;

    let app = test_app!(mock_config(&mock_server.uri(), "valid-token"));

    let req = test::TestRequest::get().uri("/api/search?q=batman").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body[0]["title"], "Movies");
}

// ─── Plex Timeline / Scrobble ────────────────────────────────────────────────

#[actix_rt::test]
async fn timeline_update() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/:/timeline"))
        .respond_with(ResponseTemplate::new(200))
        .mount(&mock_server).await;

    let app = test_app!(mock_config(&mock_server.uri(), "valid-token"));

    let req = test::TestRequest::put()
        .uri("/api/player/timeline")
        .set_json(json!({
            "ratingKey": "123", "key": "/library/metadata/123",
            "state": "playing", "time": 60000, "duration": 7200000
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body["success"], true);
}

#[actix_rt::test]
async fn scrobble_marks_watched() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/:/scrobble"))
        .respond_with(ResponseTemplate::new(200))
        .mount(&mock_server).await;

    let app = test_app!(mock_config(&mock_server.uri(), "valid-token"));

    let req = test::TestRequest::put().uri("/api/player/scrobble/123").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body["success"], true);
}

#[actix_rt::test]
async fn unscrobble_marks_unwatched() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/:/unscrobble"))
        .respond_with(ResponseTemplate::new(200))
        .mount(&mock_server).await;

    let app = test_app!(mock_config(&mock_server.uri(), "valid-token"));

    let req = test::TestRequest::put().uri("/api/player/unscrobble/123").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body["success"], true);
}

// ─── Plex Error Handling ─────────────────────────────────────────────────────

#[actix_rt::test]
async fn plex_401_returns_unauthorized() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/library/sections"))
        .respond_with(
            ResponseTemplate::new(401)
                .set_body_string("<html><body><h1>401 Unauthorized</h1></body></html>"),
        )
        .mount(&mock_server).await;

    let app = test_app!(mock_config(&mock_server.uri(), "bad-token"));

    let req = test::TestRequest::get().uri("/api/libraries").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 401);

    let body: Value = test::read_body_json(resp).await;
    assert!(body["error"].as_str().unwrap().contains("auth token"));
}

#[actix_rt::test]
async fn plex_500_returns_internal_error() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/library/sections"))
        .respond_with(ResponseTemplate::new(500).set_body_string("Internal Server Error"))
        .mount(&mock_server).await;

    let app = test_app!(mock_config(&mock_server.uri(), "valid-token"));

    let req = test::TestRequest::get().uri("/api/libraries").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 500);
}

// ─── Sonarr ──────────────────────────────────────────────────────────────────

#[actix_rt::test]
async fn sonarr_lookup() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/api/v3/series/lookup"))
        .and(query_param("term", "breaking"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!([
            {"title": "Breaking Bad", "tvdbId": 81189}
        ])))
        .mount(&mock_server).await;

    let app = test_app!(full_mock_config("http://unused", &mock_server.uri(), ""));

    let req = test::TestRequest::get().uri("/api/sonarr/lookup?term=breaking").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body[0]["title"], "Breaking Bad");
}

#[actix_rt::test]
async fn sonarr_calendar() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/api/v3/calendar"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!([
            {"seriesId": 1, "title": "S01E05", "airDate": "2026-02-15"}
        ])))
        .mount(&mock_server).await;

    let app = test_app!(full_mock_config("http://unused", &mock_server.uri(), ""));

    let req = test::TestRequest::get().uri("/api/sonarr/calendar").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let body: Value = test::read_body_json(resp).await;
    assert!(body.as_array().unwrap().len() > 0);
}

#[actix_rt::test]
async fn sonarr_queue() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/api/v3/queue"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "records": [], "totalRecords": 0
        })))
        .mount(&mock_server).await;

    let app = test_app!(full_mock_config("http://unused", &mock_server.uri(), ""));

    let req = test::TestRequest::get().uri("/api/sonarr/queue").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
}

#[actix_rt::test]
async fn sonarr_episodes() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/api/v3/episode"))
        .and(query_param("seriesId", "1"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!([
            {"id": 1, "title": "Pilot", "seasonNumber": 1, "episodeNumber": 1}
        ])))
        .mount(&mock_server).await;

    let app = test_app!(full_mock_config("http://unused", &mock_server.uri(), ""));

    let req = test::TestRequest::get().uri("/api/sonarr/episodes?seriesId=1").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body[0]["title"], "Pilot");
}

// ─── Radarr ──────────────────────────────────────────────────────────────────

#[actix_rt::test]
async fn radarr_lookup() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/api/v3/movie/lookup"))
        .and(query_param("term", "inception"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!([
            {"title": "Inception", "tmdbId": 27205}
        ])))
        .mount(&mock_server).await;

    let app = test_app!(full_mock_config("http://unused", "", &mock_server.uri()));

    let req = test::TestRequest::get().uri("/api/radarr/lookup?term=inception").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body[0]["title"], "Inception");
}

#[actix_rt::test]
async fn radarr_calendar() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/api/v3/calendar"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!([
            {"title": "Upcoming Movie", "tmdbId": 12345}
        ])))
        .mount(&mock_server).await;

    let app = test_app!(full_mock_config("http://unused", "", &mock_server.uri()));

    let req = test::TestRequest::get().uri("/api/radarr/calendar").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
}

#[actix_rt::test]
async fn radarr_queue() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/api/v3/queue"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "records": [], "totalRecords": 0
        })))
        .mount(&mock_server).await;

    let app = test_app!(full_mock_config("http://unused", "", &mock_server.uri()));

    let req = test::TestRequest::get().uri("/api/radarr/queue").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
}

// ─── Downloads ───────────────────────────────────────────────────────────────

#[actix_rt::test]
async fn downloads_empty_returns_empty() {
    let app = test_app!(mock_config("http://plex.local:32400", "token"));

    let req = test::TestRequest::get().uri("/api/downloads").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body["queue_size"], 0);
    assert_eq!(body["total_speed"], 0);
    assert_eq!(body["items"].as_array().unwrap().len(), 0);
}

#[actix_rt::test]
async fn downloads_status_returns_count() {
    let app = test_app!(mock_config("http://plex.local:32400", "token"));

    let req = test::TestRequest::get().uri("/api/downloads/status").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body["configured_clients"], 0);
}

// ─── Watch Party ─────────────────────────────────────────────────────────────

#[actix_rt::test]
async fn watch_party_create_room() {
    let app = test_app!(mock_config("http://plex.local:32400", "token"));

    let req = test::TestRequest::post()
        .uri("/api/watch-party/rooms")
        .set_json(json!({"mediaId": "123", "hostName": "TestUser"}))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body["host_name"], "TestUser");
    assert_eq!(body["media_id"], "123");
    assert_eq!(body["is_paused"], true);
    assert_eq!(body["position_ms"], 0);
    assert!(body["id"].as_str().is_some());
    assert_eq!(body["participants"].as_array().unwrap().len(), 1);
    assert_eq!(body["participants"][0], "TestUser");
}

#[actix_rt::test]
async fn watch_party_get_room() {
    let app = test_app!(mock_config("http://plex.local:32400", "token"));

    // Create room
    let create_req = test::TestRequest::post()
        .uri("/api/watch-party/rooms")
        .set_json(json!({"mediaId": "456", "hostName": "Host"}))
        .to_request();
    let create_resp = test::call_service(&app, create_req).await;
    let created: Value = test::read_body_json(create_resp).await;
    let room_id = created["id"].as_str().unwrap();

    // Fetch it
    let get_req = test::TestRequest::get()
        .uri(&format!("/api/watch-party/rooms/{}", room_id))
        .to_request();
    let get_resp = test::call_service(&app, get_req).await;
    assert_eq!(get_resp.status(), 200);

    let body: Value = test::read_body_json(get_resp).await;
    assert_eq!(body["media_id"], "456");
    assert_eq!(body["host_name"], "Host");
}

#[actix_rt::test]
async fn watch_party_nonexistent_room_returns_404() {
    let app = test_app!(mock_config("http://plex.local:32400", "token"));

    let req = test::TestRequest::get()
        .uri("/api/watch-party/rooms/00000000-0000-0000-0000-000000000000")
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 404);
}

#[actix_rt::test]
async fn watch_party_invalid_id_returns_400() {
    let app = test_app!(mock_config("http://plex.local:32400", "token"));

    let req = test::TestRequest::get()
        .uri("/api/watch-party/rooms/not-a-uuid")
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 400);
}

// ─── Live Plex Integration Tests ─────────────────────────────────────────────
// These tests require a running Plex server with valid config at the default
// config path. Run with: cargo test -- --ignored

/// Result of a transcode attempt: the master m3u8, variant m3u8, and sessions JSON.
struct TranscodeResult {
    master_m3u8: String,
    variant_m3u8: String,
    sessions: String,
    transcode_url: String,
    session_id: String,
}

/// Helper: build a transcode start URL for a given quality, fetch the variant
/// m3u8 to trigger the actual transcode, then check sessions.
async fn start_transcode(
    plex: &PlexClient,
    base_url: &str,
    token: &str,
    client_id: &str,
    media_id: &str,
    quality: &str,
) -> TranscodeResult {
    let (bitrate, resolution) = match quality {
        "1080p" => ("10000", "1920x1080"),
        "720p" => ("4000", "1280x720"),
        "480p" => ("1500", "720x480"),
        _ => ("10000", "1920x1080"),
    };
    let height = resolution.split('x').nth(1).unwrap();
    let session = uuid::Uuid::new_v4().to_string();

    let profile_extra = format!(
        "add-limitation(scope=videoCodec&scopeName=*&type=upperBound\
        &name=video.bitrate&value={bitrate}&replace=true)\
        +add-limitation(scope=videoCodec&scopeName=*&type=upperBound\
        &name=video.height&value={height}&replace=true)\
        +append-transcode-target-codec(type=videoProfile&context=streaming\
        &videoCodec=h264&audioCodec=aac&protocol=hls)"
    );

    let media_path = format!("/library/metadata/{}", media_id);
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
        ("X-Plex-Token", token),
        ("X-Plex-Client-Identifier", client_id),
        ("X-Plex-Product", "Playarr"),
        ("X-Plex-Platform", "Chrome"),
    ];

    // Step 1: Call the decision endpoint to update the transcode decision.
    // Plex caches transcode decisions per client identifier; without this,
    // start.m3u8 reuses the old quality settings.
    let decision_url = format!("{}/video/:/transcode/universal/decision", base_url);
    let _ = plex.http
        .get(&decision_url)
        .query(&transcode_params)
        .header("Accept", "application/json")
        .send()
        .await;

    // Step 2: Request the HLS manifest
    let start_url = format!("{}/video/:/transcode/universal/start.m3u8", base_url);
    let resp = plex.http
        .get(&start_url)
        .query(&transcode_params)
        .send()
        .await
        .expect("Transcode request failed");

    let actual_url = resp.url().to_string();
    assert!(
        resp.status().is_success(),
        "Plex transcode returned {} for quality {}\nURL: {}",
        resp.status(),
        quality,
        actual_url,
    );

    let master_m3u8 = resp.text().await.expect("Failed to read m3u8");

    // Extract variant URL from master m3u8 (first non-comment, non-empty line)
    let variant_path = master_m3u8
        .lines()
        .find(|line| !line.starts_with('#') && !line.is_empty())
        .expect("No variant URL in master m3u8");

    // Fetch the variant m3u8
    let variant_url = if variant_path.starts_with("http") {
        variant_path.to_string()
    } else {
        format!(
            "{}/video/:/transcode/universal/{}",
            base_url, variant_path
        )
    };

    println!("  Fetching variant: {}", variant_url);
    let variant_resp = plex.http
        .get(&variant_url)
        .query(&[("X-Plex-Token", token)])
        .header("X-Plex-Client-Identifier", client_id)
        .header("X-Plex-Product", "Playarr")
        .send()
        .await
        .expect("Variant m3u8 request failed");

    let variant_m3u8 = if variant_resp.status().is_success() {
        variant_resp.text().await.unwrap_or_default()
    } else {
        format!("ERROR: {}", variant_resp.status())
    };

    // Extract the session base URL (e.g., session/{uuid}/base/)
    let session_base = variant_path.trim_end_matches("index.m3u8");

    // Find the first .ts segment in the variant m3u8 and fetch it to trigger
    // the actual transcode. Plex only starts transcoding when segments are
    // requested, not when the m3u8 playlists are fetched.
    let first_segment = variant_m3u8
        .lines()
        .find(|line| line.ends_with(".ts"));

    if let Some(seg) = first_segment {
        let seg_url = format!(
            "{}/video/:/transcode/universal/{}{}",
            base_url, session_base, seg
        );
        println!("  Fetching segment to trigger transcode: {}", seg_url);
        let seg_resp = plex.http
            .get(&seg_url)
            .query(&[("X-Plex-Token", token)])
            .header("X-Plex-Client-Identifier", client_id)
            .header("X-Plex-Product", "Playarr")
            .send()
            .await;
        if let Ok(resp) = seg_resp {
            let status = resp.status();
            let size = resp.bytes().await.map(|b| b.len()).unwrap_or(0);
            println!("  Segment response: status={}, size={} bytes", status, size);
        }
    }

    // Wait for Plex to register the transcode session
    tokio::time::sleep(std::time::Duration::from_secs(3)).await;

    // Fetch active sessions to see what Plex is actually doing
    let sessions_resp = plex.http
        .get(&format!("{}/status/sessions", base_url))
        .query(&[("X-Plex-Token", token)])
        .header("Accept", "application/json")
        .send()
        .await
        .expect("Sessions request failed");

    let sessions_body = sessions_resp.text().await.unwrap_or_default();

    // Stop the transcode session so we don't leave junk running
    let _ = plex.http
        .get(&format!(
            "{}/video/:/transcode/universal/stop",
            base_url
        ))
        .query(&[
            ("session", session.as_str()),
            ("X-Plex-Token", token),
            ("X-Plex-Client-Identifier", client_id),
        ])
        .send()
        .await;

    // Small delay to let the session fully stop before the next test
    tokio::time::sleep(std::time::Duration::from_secs(1)).await;

    TranscodeResult {
        master_m3u8,
        variant_m3u8,
        sessions: sessions_body,
        transcode_url: actual_url,
        session_id: session,
    }
}

#[actix_rt::test]
#[ignore] // Requires live Plex server — run with: cargo test -- --ignored
async fn live_plex_transcode_resolution_changes() {
    let config = crate::config::load_config();
    let base_url = config.plex.url.trim_end_matches('/').to_string();
    let token = config.plex.token.clone();
    let client_id = config.plex.client_id.clone();

    assert!(!base_url.is_empty(), "Plex URL not configured");
    assert!(!token.is_empty(), "Plex token not configured");

    let shared = Arc::new(RwLock::new(config));
    let plex = PlexClient::new(shared);

    // ── Step 1: Find a video item to test with ──────────────────────────
    let libs_req = plex.get("/library/sections").expect("build libs request");
    let libs = plex.send_json(libs_req).await.expect("fetch libraries");
    let sections = libs["MediaContainer"]["Directory"]
        .as_array()
        .expect("No libraries found");

    // Find a movie or show library
    let video_section = sections
        .iter()
        .find(|s| {
            let t = s["type"].as_str().unwrap_or("");
            t == "movie" || t == "show"
        })
        .expect("No movie or show library found");

    let section_key = video_section["key"].as_str().unwrap();
    let section_type = video_section["type"].as_str().unwrap();
    println!(
        "Using library: {} (type={}, key={})",
        video_section["title"].as_str().unwrap_or("?"),
        section_type,
        section_key
    );

    // Get items from this library
    let items_req = plex
        .get(&format!(
            "/library/sections/{}/all?X-Plex-Container-Start=0&X-Plex-Container-Size=5",
            section_key
        ))
        .expect("build items request");
    let items = plex.send_json(items_req).await.expect("fetch items");
    let metadata = items["MediaContainer"]["Metadata"]
        .as_array()
        .expect("No items in library");

    assert!(!metadata.is_empty(), "Library is empty");

    // For shows, drill down to an episode
    let media_id = if section_type == "show" {
        let show_key = metadata[0]["ratingKey"].as_str().unwrap();
        // Get seasons
        let seasons_req = plex
            .get(&format!("/library/metadata/{}/children", show_key))
            .expect("build seasons request");
        let seasons = plex.send_json(seasons_req).await.expect("fetch seasons");
        let season_key = seasons["MediaContainer"]["Metadata"]
            .as_array()
            .and_then(|s| s.iter().find(|s| s["index"].as_i64().unwrap_or(0) > 0))
            .expect("No seasons found")["ratingKey"]
            .as_str()
            .unwrap()
            .to_string();

        // Get episodes
        let eps_req = plex
            .get(&format!("/library/metadata/{}/children", season_key))
            .expect("build eps request");
        let eps = plex.send_json(eps_req).await.expect("fetch episodes");
        eps["MediaContainer"]["Metadata"]
            .as_array()
            .expect("No episodes")[0]["ratingKey"]
            .as_str()
            .unwrap()
            .to_string()
    } else {
        metadata[0]["ratingKey"].as_str().unwrap().to_string()
    };

    println!("Testing with media ratingKey: {}", media_id);

    // ── Step 2: Fetch metadata to see original resolution ───────────────
    let meta_req = plex
        .get(&format!("/library/metadata/{}", media_id))
        .expect("build meta request");
    let meta = plex.send_json(meta_req).await.expect("fetch metadata");
    let source_height = meta["MediaContainer"]["Metadata"][0]["Media"][0]["videoResolution"]
        .as_str()
        .unwrap_or("unknown");
    let source_width = meta["MediaContainer"]["Metadata"][0]["Media"][0]["width"]
        .as_i64()
        .unwrap_or(0);
    let source_h = meta["MediaContainer"]["Metadata"][0]["Media"][0]["height"]
        .as_i64()
        .unwrap_or(0);
    println!(
        "Source resolution: {}p ({}x{})",
        source_height, source_width, source_h
    );

    // ── Step 3: Start transcode at 1080p ────────────────────────────────
    println!("\n--- Requesting 1080p transcode ---");
    let r1080 =
        start_transcode(&plex, &base_url, &token, &client_id, &media_id, "1080p").await;

    println!("1080p URL:\n  {}", r1080.transcode_url);
    println!("1080p master m3u8:\n{}", r1080.master_m3u8);
    println!("1080p variant m3u8 (first 500 chars):\n{}", &r1080.variant_m3u8[..r1080.variant_m3u8.len().min(500)]);
    println!("Sessions after 1080p:\n{}", r1080.sessions);

    // ── Step 4: Start transcode at 480p ─────────────────────────────────
    println!("\n--- Requesting 480p transcode ---");
    let r480 =
        start_transcode(&plex, &base_url, &token, &client_id, &media_id, "480p").await;

    println!("480p URL:\n  {}", r480.transcode_url);
    println!("480p master m3u8:\n{}", r480.master_m3u8);
    println!("480p variant m3u8 (first 500 chars):\n{}", &r480.variant_m3u8[..r480.variant_m3u8.len().min(500)]);
    println!("Sessions after 480p:\n{}", r480.sessions);

    // ── Step 5: Parse and compare ───────────────────────────────────────
    fn extract_resolution(m3u8: &str) -> Option<String> {
        for line in m3u8.lines() {
            if line.contains("RESOLUTION=") {
                let res = line
                    .split("RESOLUTION=")
                    .nth(1)?
                    .split(|c: char| c == ',' || c.is_whitespace())
                    .next()?;
                return Some(res.to_string());
            }
        }
        None
    }

    fn extract_bandwidth(m3u8: &str) -> Option<u64> {
        for line in m3u8.lines() {
            if line.contains("BANDWIDTH=") {
                let bw = line
                    .split("BANDWIDTH=")
                    .nth(1)?
                    .split(|c: char| c == ',' || c.is_whitespace())
                    .next()?;
                return bw.parse().ok();
            }
        }
        None
    }

    /// Extract transcode session info from Plex /status/sessions response
    fn extract_session_info(sessions_json: &str) -> Vec<serde_json::Value> {
        let parsed: serde_json::Value =
            serde_json::from_str(sessions_json).unwrap_or(json!({}));
        parsed["MediaContainer"]["Metadata"]
            .as_array()
            .cloned()
            .unwrap_or_default()
    }

    let res_1080 = extract_resolution(&r1080.master_m3u8);
    let res_480 = extract_resolution(&r480.master_m3u8);
    let bw_1080 = extract_bandwidth(&r1080.master_m3u8);
    let bw_480 = extract_bandwidth(&r480.master_m3u8);

    println!("\n=== MASTER M3U8 RESULTS ===");
    println!("1080p: resolution={:?}, bandwidth={:?}", res_1080, bw_1080);
    println!("480p:  resolution={:?}, bandwidth={:?}", res_480, bw_480);

    let sessions_1080 = extract_session_info(&r1080.sessions);
    let sessions_480 = extract_session_info(&r480.sessions);

    println!("\n=== SESSION INFO ===");
    for s in &sessions_1080 {
        println!("1080p session: videoDecision={}, width={}, height={}, throttled={}, speed={}",
            s["TranscodeSession"]["videoDecision"],
            s["TranscodeSession"]["width"],
            s["TranscodeSession"]["height"],
            s["TranscodeSession"]["throttled"],
            s["TranscodeSession"]["speed"],
        );
    }
    for s in &sessions_480 {
        println!("480p session:  videoDecision={}, width={}, height={}, throttled={}, speed={}",
            s["TranscodeSession"]["videoDecision"],
            s["TranscodeSession"]["width"],
            s["TranscodeSession"]["height"],
            s["TranscodeSession"]["throttled"],
            s["TranscodeSession"]["speed"],
        );
    }

    // Primary assertion: master m3u8 should show different resolutions/bandwidths
    let has_resolution_info = res_1080.is_some() && res_480.is_some();
    if has_resolution_info {
        assert_ne!(
            res_1080.as_deref(),
            res_480.as_deref(),
            "Master m3u8 resolutions should differ: 1080p={:?}, 480p={:?}",
            res_1080,
            res_480
        );
    }

    if let (Some(bw1), Some(bw2)) = (bw_1080, bw_480) {
        assert!(
            bw1 > bw2,
            "Expected 1080p bandwidth ({}) > 480p bandwidth ({})",
            bw1,
            bw2
        );
    }

    // Fallback: if master m3u8 doesn't differ, check sessions
    if !has_resolution_info || res_1080 == res_480 {
        // At least one session should have been captured and show "transcode" decision
        let any_transcode = sessions_480.iter().any(|s| {
            s["TranscodeSession"]["videoDecision"].as_str() == Some("transcode")
        });
        assert!(
            any_transcode,
            "No transcode sessions detected for 480p. Plex is ignoring quality parameters.\n\
            Sessions 480p: {:?}",
            sessions_480
        );
    }
}

