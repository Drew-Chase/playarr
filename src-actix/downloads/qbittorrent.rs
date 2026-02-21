use super::{ClientDownloads, DownloadHistoryItem, DownloadItem};

pub async fn fetch_downloads(url: &str) -> anyhow::Result<ClientDownloads> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;

    let base = url.trim_end_matches('/');

    // Fetch active and completed torrents in parallel
    let active_url = format!("{}/api/v2/torrents/info?filter=active", base);
    let completed_url = format!("{}/api/v2/torrents/info?filter=completed", base);

    let (active_resp, completed_resp) = tokio::join!(
        client.get(&active_url).send(),
        client.get(&completed_url).send(),
    );

    // Parse active (queue)
    let mut queue = Vec::new();
    if let Ok(resp) = active_resp {
        if let Ok(torrents) = resp.json::<Vec<serde_json::Value>>().await {
            for t in &torrents {
                let progress = t["progress"].as_f64().unwrap_or(0.0) * 100.0;
                // Skip completed torrents from the active list
                if progress >= 100.0 {
                    continue;
                }
                let size = t["size"].as_u64().unwrap_or(0);
                let downloaded = t["downloaded"].as_u64().unwrap_or(0);
                let dlspeed = t["dlspeed"].as_u64().unwrap_or(0);
                let eta_secs = t["eta"].as_u64().unwrap_or(0);
                let eta = if eta_secs > 0 && eta_secs < 8640000 {
                    let h = eta_secs / 3600;
                    let m = (eta_secs % 3600) / 60;
                    let s = eta_secs % 60;
                    Some(format!("{:02}:{:02}:{:02}", h, m, s))
                } else {
                    None
                };

                let status = match t["state"].as_str().unwrap_or("") {
                    "downloading" => "downloading",
                    "stalledDL" => "downloading",
                    "pausedDL" => "paused",
                    "queuedDL" => "queued",
                    "uploading" | "stalledUP" => "seeding",
                    "checkingDL" | "checkingUP" => "checking",
                    s => s,
                };

                queue.push(DownloadItem {
                    name: t["name"].as_str().unwrap_or("Unknown").to_string(),
                    progress,
                    speed: dlspeed,
                    eta,
                    status: status.to_string(),
                    size,
                    downloaded,
                    client_name: String::new(),
                    client_type: "qbittorrent".to_string(),
                });
            }
        }
    }

    // Parse completed (history)
    let mut history = Vec::new();
    if let Ok(resp) = completed_resp {
        if let Ok(torrents) = resp.json::<Vec<serde_json::Value>>().await {
            for t in torrents.iter().take(50) {
                let size = t["size"].as_u64().unwrap_or(0);
                let completion_on = t["completion_on"].as_i64().and_then(|ts| {
                    if ts > 0 {
                        chrono::DateTime::from_timestamp(ts, 0)
                            .map(|dt| dt.format("%Y-%m-%d %H:%M").to_string())
                    } else {
                        None
                    }
                });

                let status = match t["state"].as_str().unwrap_or("") {
                    "uploading" | "stalledUP" => "seeding",
                    "pausedUP" => "completed",
                    _ => "completed",
                };

                history.push(DownloadHistoryItem {
                    name: t["name"].as_str().unwrap_or("Unknown").to_string(),
                    status: status.to_string(),
                    size,
                    completed_at: completion_on,
                    client_name: String::new(),
                    client_type: "qbittorrent".to_string(),
                });
            }
        }
    }

    Ok(ClientDownloads { queue, history })
}
