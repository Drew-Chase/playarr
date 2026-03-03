use std::sync::{Arc, OnceLock, RwLock};

use actix_web::{get, web, HttpResponse, Responder};
use log::warn;
use serde::Serialize;
use serde_json::json;

use crate::config::models::DownloadClientType;
use crate::config::SharedConfig;
use crate::http_error::Result;
use crate::plex::client::PlexClient;
use crate::radarr::client::RadarrClient;
use crate::sonarr::client::SonarrClient;
use crate::watch_party::room::RoomManager;

pub static START_TIME: OnceLock<u64> = OnceLock::new();

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

#[derive(Serialize, Clone)]
struct StatusResponse {
    version: &'static str,
    setup_complete: bool,
    uptime_ms: u64,
    start_time: u64,
    debug: bool,
    os: &'static str,
    arch: &'static str,
    active_watch_parties: usize,
    config_path: String,
    services: ServiceStatuses,
}

#[derive(Serialize, Clone, Default)]
pub struct ServiceStatuses {
    plex: ServiceHealth,
    sonarr: ServiceHealth,
    radarr: ServiceHealth,
    download_clients: Vec<DownloadClientHealth>,
    opensubtitles: SimpleServiceHealth,
}

#[derive(Serialize, Clone, Default)]
struct ServiceHealth {
    configured: bool,
    reachable: Option<bool>,
    version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    last_checked: Option<u64>,
}

#[derive(Serialize, Clone)]
struct DownloadClientHealth {
    name: String,
    client_type: DownloadClientType,
    enabled: bool,
    reachable: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    last_checked: Option<u64>,
}

#[derive(Serialize, Clone, Default)]
struct SimpleServiceHealth {
    configured: bool,
}

// ---------------------------------------------------------------------------
// Shared health state (written by background task, read by endpoint)
// ---------------------------------------------------------------------------

pub type SharedHealthState = Arc<RwLock<ServiceStatuses>>;

pub fn new_health_state() -> SharedHealthState {
    Arc::new(RwLock::new(ServiceStatuses::default()))
}

// ---------------------------------------------------------------------------
// Background health checker
// ---------------------------------------------------------------------------

pub async fn run_health_checks(
    state: SharedHealthState,
    config: SharedConfig,
    plex: web::Data<PlexClient>,
    sonarr: web::Data<SonarrClient>,
    radarr: web::Data<RadarrClient>,
) {
    let mut interval = actix_web::rt::time::interval(std::time::Duration::from_secs(30));
    loop {
        interval.tick().await;
        let statuses = check_all(&config, &plex, &sonarr, &radarr).await;
        if let Ok(mut guard) = state.write() {
            *guard = statuses;
        }
    }
}

async fn check_all(
    config: &SharedConfig,
    plex: &PlexClient,
    sonarr: &SonarrClient,
    radarr: &RadarrClient,
) -> ServiceStatuses {
    // Read config snapshot once
    let cfg = match config.read() {
        Ok(c) => c.clone(),
        Err(_) => return ServiceStatuses::default(),
    };

    let now = chrono::Utc::now().timestamp_millis() as u64;

    // Run all checks concurrently
    let (plex_health, sonarr_health, radarr_health, dl_healths) = tokio::join!(
        check_plex(plex, &cfg.plex, now),
        check_arr(sonarr, &cfg.sonarr.url, &cfg.sonarr.api_key, now),
        check_arr(radarr, &cfg.radarr.url, &cfg.radarr.api_key, now),
        check_download_clients(&cfg.download_clients, now),
    );

    ServiceStatuses {
        plex: plex_health,
        sonarr: sonarr_health,
        radarr: radarr_health,
        download_clients: dl_healths,
        opensubtitles: SimpleServiceHealth {
            configured: !cfg.opensubtitles.api_key.is_empty(),
        },
    }
}

async fn check_plex(
    client: &PlexClient,
    cfg: &crate::config::models::PlexConfig,
    now: u64,
) -> ServiceHealth {
    let configured = !cfg.url.is_empty() && !cfg.token.is_empty();
    if !configured {
        return ServiceHealth {
            configured: false,
            ..Default::default()
        };
    }

    // Hit the PMS root endpoint — lightweight, returns server info
    let base_url = cfg.url.trim_end_matches('/');
    let resp = client
        .http
        .get(base_url)
        .query(&[("X-Plex-Token", cfg.token.as_str())])
        .header("Accept", "application/json")
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await;

    match resp {
        Ok(r) if r.status().is_success() => {
            let version = r
                .json::<serde_json::Value>()
                .await
                .ok()
                .and_then(|v| {
                    v["MediaContainer"]["version"]
                        .as_str()
                        .map(|s| s.to_string())
                });
            ServiceHealth {
                configured: true,
                reachable: Some(true),
                version,
                last_checked: Some(now),
            }
        }
        Ok(r) => {
            warn!("Plex health check returned HTTP {}", r.status());
            ServiceHealth {
                configured: true,
                reachable: Some(false),
                version: None,
                last_checked: Some(now),
            }
        }
        Err(e) => {
            warn!("Plex health check failed: {}", e);
            ServiceHealth {
                configured: true,
                reachable: Some(false),
                version: None,
                last_checked: Some(now),
            }
        }
    }
}

/// Check Sonarr or Radarr — both expose `/api/v3/system/status`.
async fn check_arr<C: HasHttp>(client: &C, url: &str, api_key: &str, now: u64) -> ServiceHealth {
    let configured = !url.is_empty() && !api_key.is_empty();
    if !configured {
        return ServiceHealth {
            configured: false,
            ..Default::default()
        };
    }

    let check_url = format!(
        "{}/api/v3/system/status",
        url.trim_end_matches('/')
    );
    let resp = client
        .http_client()
        .get(&check_url)
        .header("X-Api-Key", api_key)
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await;

    match resp {
        Ok(r) if r.status().is_success() => {
            let version = r
                .json::<serde_json::Value>()
                .await
                .ok()
                .and_then(|v| v["version"].as_str().map(|s| s.to_string()));
            ServiceHealth {
                configured: true,
                reachable: Some(true),
                version,
                last_checked: Some(now),
            }
        }
        Ok(r) => {
            warn!("Arr health check returned HTTP {}", r.status());
            ServiceHealth {
                configured: true,
                reachable: Some(false),
                version: None,
                last_checked: Some(now),
            }
        }
        Err(e) => {
            warn!("Arr health check failed: {}", e);
            ServiceHealth {
                configured: true,
                reachable: Some(false),
                version: None,
                last_checked: Some(now),
            }
        }
    }
}

/// Minimal trait so we can reuse `check_arr` for both SonarrClient and RadarrClient.
trait HasHttp {
    fn http_client(&self) -> &reqwest::Client;
}

impl HasHttp for SonarrClient {
    fn http_client(&self) -> &reqwest::Client {
        &self.http
    }
}

impl HasHttp for RadarrClient {
    fn http_client(&self) -> &reqwest::Client {
        &self.http
    }
}

async fn check_download_clients(
    clients: &[crate::config::models::DownloadClientConfig],
    now: u64,
) -> Vec<DownloadClientHealth> {
    let mut results = Vec::with_capacity(clients.len());
    let http = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .unwrap();

    for client_cfg in clients {
        if client_cfg.url.is_empty() {
            results.push(DownloadClientHealth {
                name: client_cfg.name.clone(),
                client_type: client_cfg.client_type.clone(),
                enabled: client_cfg.enabled,
                reachable: None,
                last_checked: None,
            });
            continue;
        }

        if !client_cfg.enabled {
            results.push(DownloadClientHealth {
                name: client_cfg.name.clone(),
                client_type: client_cfg.client_type.clone(),
                enabled: false,
                reachable: None,
                last_checked: None,
            });
            continue;
        }

        let base = client_cfg.url.trim_end_matches('/');
        let reachable = match client_cfg.client_type {
            DownloadClientType::Sabnzbd => {
                let url = format!(
                    "{}/api?mode=version&apikey={}&output=json",
                    base, client_cfg.api_key
                );
                http.get(&url).send().await.is_ok_and(|r| r.status().is_success())
            }
            DownloadClientType::Nzbget => {
                let url = format!("{}/jsonrpc", base);
                let body = json!({"method": "version", "params": []});
                let req = http.post(&url).json(&body);
                let req = if !client_cfg.username.is_empty() {
                    req.basic_auth(&client_cfg.username, Some(&client_cfg.password))
                } else {
                    req
                };
                req.send().await.is_ok_and(|r| r.status().is_success())
            }
            DownloadClientType::Qbittorrent => {
                let url = format!("{}/api/v2/app/version", base);
                http.get(&url).send().await.is_ok_and(|r| r.status().is_success())
            }
            DownloadClientType::Transmission => {
                let url = format!("{}/transmission/rpc", base);
                let body = json!({"method": "session-get"});
                let req = http.post(&url).json(&body);
                let req = if !client_cfg.username.is_empty() {
                    req.basic_auth(&client_cfg.username, Some(&client_cfg.password))
                } else {
                    req
                };
                // Transmission returns 409 with X-Transmission-Session-Id on first call — that still means reachable
                req.send().await.is_ok_and(|r| {
                    r.status().is_success() || r.status().as_u16() == 409
                })
            }
        };

        results.push(DownloadClientHealth {
            name: client_cfg.name.clone(),
            client_type: client_cfg.client_type.clone(),
            enabled: client_cfg.enabled,
            reachable: Some(reachable),
            last_checked: Some(now),
        });
    }

    results
}

// ---------------------------------------------------------------------------
// Endpoint
// ---------------------------------------------------------------------------

#[get("")]
async fn get_status(
    config: web::Data<SharedConfig>,
    health: web::Data<SharedHealthState>,
    room_manager: web::Data<RoomManager>,
) -> Result<impl Responder> {
    let now = chrono::Utc::now().timestamp_millis() as u64;
    let start = *START_TIME.get_or_init(|| now);

    let setup_complete = {
        let cfg = config.read().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
        !cfg.plex.url.is_empty() && !cfg.plex.token.is_empty()
    };

    let services = health
        .read()
        .map(|g| g.clone())
        .unwrap_or_default();

    Ok(HttpResponse::Ok().json(StatusResponse {
        version: env!("CARGO_PKG_VERSION"),
        setup_complete,
        uptime_ms: now - start,
        start_time: start,
        debug: crate::DEBUG,
        os: std::env::consts::OS,
        arch: std::env::consts::ARCH,
        active_watch_parties: room_manager.rooms.len(),
        config_path: crate::config::config_path().display().to_string(),
        services,
    }))
}

// ---------------------------------------------------------------------------
// Route configuration
// ---------------------------------------------------------------------------

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/status")
            .service(get_status)
            .default_service(web::to(|| async {
                HttpResponse::NotFound().json(json!({
                    "error": "API endpoint not found",
                }))
            })),
    );
}
