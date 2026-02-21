pub mod sabnzbd;
pub mod nzbget;
pub mod qbittorrent;
pub mod transmission;

use actix_web::{get, post, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use crate::config::SharedConfig;
use crate::config::models::DownloadClientType;
use crate::http_error::Result;

#[derive(Debug, Serialize, Clone)]
pub struct DownloadItem {
    pub name: String,
    pub progress: f64,
    pub speed: u64,
    pub eta: Option<String>,
    pub status: String,
    pub size: u64,
    pub downloaded: u64,
    pub client_name: String,
    pub client_type: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct DownloadHistoryItem {
    pub name: String,
    pub status: String,
    pub size: u64,
    pub completed_at: Option<String>,
    pub client_name: String,
    pub client_type: String,
}

pub struct ClientDownloads {
    pub paused: bool,
    pub queue: Vec<DownloadItem>,
    pub history: Vec<DownloadHistoryItem>,
}

#[derive(Debug, Serialize)]
pub struct DownloadStatus {
    pub total_speed: u64,
    pub queue_size: usize,
    pub paused: bool,
    pub queue: Vec<DownloadItem>,
    pub history: Vec<DownloadHistoryItem>,
}

#[derive(Debug, Deserialize)]
struct PauseResumeRequest {
    action: String, // "pause" or "resume"
}

#[get("")]
async fn get_downloads(
    config: web::Data<SharedConfig>,
) -> Result<impl Responder> {
    let cfg = config.read().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
    let mut all_queue: Vec<DownloadItem> = Vec::new();
    let mut all_history: Vec<DownloadHistoryItem> = Vec::new();
    let mut any_client = false;
    let mut all_paused = true;

    for client_cfg in &cfg.download_clients {
        if !client_cfg.enabled {
            continue;
        }
        let result = match client_cfg.client_type {
            DownloadClientType::Sabnzbd => {
                sabnzbd::fetch_downloads(&client_cfg.url, &client_cfg.api_key).await
            }
            DownloadClientType::Nzbget => {
                nzbget::fetch_downloads(&client_cfg.url, &client_cfg.username, &client_cfg.password).await
            }
            DownloadClientType::Qbittorrent => {
                qbittorrent::fetch_downloads(&client_cfg.url).await
            }
            DownloadClientType::Transmission => {
                transmission::fetch_downloads(&client_cfg.url, &client_cfg.username, &client_cfg.password).await
            }
        };

        match result {
            Ok(mut downloads) => {
                for item in &mut downloads.queue {
                    item.client_name = client_cfg.name.clone();
                }
                for item in &mut downloads.history {
                    item.client_name = client_cfg.name.clone();
                }
                if !downloads.queue.is_empty() {
                    any_client = true;
                    if !downloads.paused {
                        all_paused = false;
                    }
                }
                all_queue.extend(downloads.queue);
                all_history.extend(downloads.history);
            }
            Err(e) => {
                log::warn!("Failed to fetch from {}: {}", client_cfg.name, e);
            }
        }
    }

    let total_speed: u64 = all_queue.iter().map(|i| i.speed).sum();
    let paused = any_client && all_paused;
    let status = DownloadStatus {
        total_speed,
        queue_size: all_queue.len(),
        paused,
        queue: all_queue,
        history: all_history,
    };

    Ok(HttpResponse::Ok().json(status))
}

#[post("/pause")]
async fn pause_resume_downloads(
    config: web::Data<SharedConfig>,
    body: web::Json<PauseResumeRequest>,
) -> Result<impl Responder> {
    let cfg = config.read().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;

    for client_cfg in &cfg.download_clients {
        if !client_cfg.enabled {
            continue;
        }

        let result = match (&client_cfg.client_type, body.action.as_str()) {
            (DownloadClientType::Sabnzbd, "pause") => {
                sabnzbd::pause_queue(&client_cfg.url, &client_cfg.api_key).await
            }
            (DownloadClientType::Sabnzbd, "resume") => {
                sabnzbd::resume_queue(&client_cfg.url, &client_cfg.api_key).await
            }
            (DownloadClientType::Nzbget, "pause") => {
                nzbget::pause_queue(&client_cfg.url, &client_cfg.username, &client_cfg.password).await
            }
            (DownloadClientType::Nzbget, "resume") => {
                nzbget::resume_queue(&client_cfg.url, &client_cfg.username, &client_cfg.password).await
            }
            (DownloadClientType::Qbittorrent, "pause") => {
                qbittorrent::pause_queue(&client_cfg.url).await
            }
            (DownloadClientType::Qbittorrent, "resume") => {
                qbittorrent::resume_queue(&client_cfg.url).await
            }
            (DownloadClientType::Transmission, "pause") => {
                transmission::pause_queue(&client_cfg.url, &client_cfg.username, &client_cfg.password).await
            }
            (DownloadClientType::Transmission, "resume") => {
                transmission::resume_queue(&client_cfg.url, &client_cfg.username, &client_cfg.password).await
            }
            _ => continue,
        };

        if let Err(e) = result {
            log::warn!("Failed to {} on {}: {}", body.action, client_cfg.name, e);
        }
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({"success": true})))
}

#[get("/status")]
async fn get_status(
    config: web::Data<SharedConfig>,
) -> Result<impl Responder> {
    let cfg = config.read().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
    let active_count: usize = cfg.download_clients.iter().filter(|c| c.enabled).count();
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "configured_clients": active_count
    })))
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/downloads")
            .service(get_downloads)
            .service(get_status)
            .service(pause_resume_downloads),
    );
}
