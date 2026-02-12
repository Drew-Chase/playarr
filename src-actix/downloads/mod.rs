pub mod sabnzbd;
pub mod nzbget;
pub mod qbittorrent;
pub mod transmission;

use actix_web::{get, web, HttpResponse, Responder};
use serde::Serialize;
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

#[derive(Debug, Serialize)]
pub struct DownloadStatus {
    pub total_speed: u64,
    pub queue_size: usize,
    pub items: Vec<DownloadItem>,
}

#[get("")]
async fn get_downloads(
    config: web::Data<SharedConfig>,
) -> Result<impl Responder> {
    let cfg = config.read().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
    let mut all_items: Vec<DownloadItem> = Vec::new();

    for client_cfg in &cfg.download_clients {
        if !client_cfg.enabled {
            continue;
        }
        let items = match client_cfg.client_type {
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

        match items {
            Ok(mut items) => {
                for item in &mut items {
                    item.client_name = client_cfg.name.clone();
                }
                all_items.extend(items);
            }
            Err(e) => {
                log::warn!("Failed to fetch from {}: {}", client_cfg.name, e);
            }
        }
    }

    let total_speed: u64 = all_items.iter().map(|i| i.speed).sum();
    let status = DownloadStatus {
        total_speed,
        queue_size: all_items.len(),
        items: all_items,
    };

    Ok(HttpResponse::Ok().json(status))
}

#[get("/status")]
async fn get_status(
    config: web::Data<SharedConfig>,
) -> Result<impl Responder> {
    // Light version - just speeds and counts
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
            .service(get_status),
    );
}
