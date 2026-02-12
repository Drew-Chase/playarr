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
        },
        sonarr: SonarrConfig::default(),
        radarr: RadarrConfig::default(),
        tmdb: TmdbConfig::default(),
        download_clients: vec![],
    }))
}

fn full_mock_config(plex_url: &str, sonarr_url: &str, radarr_url: &str, tmdb_key: &str) -> SharedConfig {
    Arc::new(RwLock::new(AppConfig {
        plex: PlexConfig {
            url: plex_url.to_string(),
            token: "test-token-abc123".to_string(),
            client_id: "test-client-id".to_string(),
        },
        sonarr: SonarrConfig {
            url: sonarr_url.to_string(),
            api_key: "sonarr-key".to_string(),
        },
        radarr: RadarrConfig {
            url: radarr_url.to_string(),
            api_key: "radarr-key".to_string(),
        },
        tmdb: TmdbConfig {
            api_key: tmdb_key.to_string(),
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
async fn settings_update_tmdb() {
    let config = mock_config("", "");
    let app = test_app!(config.clone());

    let req = test::TestRequest::put()
        .uri("/api/settings/tmdb")
        .set_json(json!({ "api_key": "tmdb-abc" }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    let cfg = config.read().unwrap();
    assert_eq!(cfg.tmdb.api_key, "tmdb-abc");
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

    let req = test::TestRequest::post().uri("/api/settings/test/unknown").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 400);

    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body["success"], false);
}

#[actix_rt::test]
async fn settings_test_plex_unconfigured_returns_400() {
    let app = test_app!(mock_config("", ""));

    let req = test::TestRequest::post().uri("/api/settings/test/plex").to_request();
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

    let app = test_app!(full_mock_config("http://unused", &mock_server.uri(), "", ""));

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

    let app = test_app!(full_mock_config("http://unused", &mock_server.uri(), "", ""));

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

    let app = test_app!(full_mock_config("http://unused", &mock_server.uri(), "", ""));

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

    let app = test_app!(full_mock_config("http://unused", &mock_server.uri(), "", ""));

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

    let app = test_app!(full_mock_config("http://unused", "", &mock_server.uri(), ""));

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

    let app = test_app!(full_mock_config("http://unused", "", &mock_server.uri(), ""));

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

    let app = test_app!(full_mock_config("http://unused", "", &mock_server.uri(), ""));

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

// ─── Discover ────────────────────────────────────────────────────────────────

#[actix_rt::test]
async fn discover_without_tmdb_key_returns_503() {
    let app = test_app!(mock_config("http://plex.local:32400", "token"));

    let req = test::TestRequest::get().uri("/api/discover/trending").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 503);
}

#[actix_rt::test]
async fn discover_upcoming_without_key_returns_503() {
    let app = test_app!(mock_config("http://plex.local:32400", "token"));

    let req = test::TestRequest::get().uri("/api/discover/upcoming").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 503);
}

#[actix_rt::test]
async fn discover_recent_without_key_returns_503() {
    let app = test_app!(mock_config("http://plex.local:32400", "token"));

    let req = test::TestRequest::get().uri("/api/discover/recent").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 503);
}
