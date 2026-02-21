use super::{ClientDownloads, DownloadHistoryItem, DownloadItem};

pub async fn pause_queue(url: &str, api_key: &str) -> anyhow::Result<()> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;
    let api_url = format!("{}/api?mode=pause&apikey={}", url.trim_end_matches('/'), api_key);
    client.get(&api_url).send().await?;
    Ok(())
}

pub async fn resume_queue(url: &str, api_key: &str) -> anyhow::Result<()> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;
    let api_url = format!("{}/api?mode=resume&apikey={}", url.trim_end_matches('/'), api_key);
    client.get(&api_url).send().await?;
    Ok(())
}

pub async fn fetch_downloads(url: &str, api_key: &str) -> anyhow::Result<ClientDownloads> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;

    let base = url.trim_end_matches('/');

    // Fetch queue and history in parallel
    let queue_url = format!("{}/api?mode=queue&output=json&apikey={}", base, api_key);
    let history_url = format!("{}/api?mode=history&output=json&limit=50&apikey={}", base, api_key);

    let (queue_resp, history_resp) = tokio::join!(
        client.get(&queue_url).send(),
        client.get(&history_url).send(),
    );

    // Parse queue
    let mut queue = Vec::new();
    let mut paused = false;
    if let Ok(resp) = queue_resp {
        if let Ok(json) = resp.json::<serde_json::Value>().await {
            paused = json["queue"]["paused"].as_bool().unwrap_or(false);
            if let Some(slots) = json["queue"]["slots"].as_array() {
                let speed_str = json["queue"]["kbpersec"].as_str().unwrap_or("0");
                let speed = (speed_str.parse::<f64>().unwrap_or(0.0) * 1024.0) as u64;

                for slot in slots {
                    let mb_left = slot["mbleft"].as_str().unwrap_or("0").parse::<f64>().unwrap_or(0.0);
                    let mb_total = slot["mb"].as_str().unwrap_or("0").parse::<f64>().unwrap_or(0.0);
                    let progress = if mb_total > 0.0 {
                        ((mb_total - mb_left) / mb_total) * 100.0
                    } else {
                        0.0
                    };

                    queue.push(DownloadItem {
                        name: slot["filename"].as_str().unwrap_or("Unknown").to_string(),
                        progress,
                        speed,
                        eta: slot["timeleft"].as_str().map(String::from),
                        status: slot["status"].as_str().unwrap_or("unknown").to_lowercase(),
                        size: (mb_total * 1024.0 * 1024.0) as u64,
                        downloaded: ((mb_total - mb_left) * 1024.0 * 1024.0) as u64,
                        client_name: String::new(),
                        client_type: "sabnzbd".to_string(),
                    });
                }
            }
        }
    }

    // Parse history
    let mut history = Vec::new();
    if let Ok(resp) = history_resp {
        if let Ok(json) = resp.json::<serde_json::Value>().await {
            if let Some(slots) = json["history"]["slots"].as_array() {
                for slot in slots {
                    let bytes = slot["bytes"].as_u64().unwrap_or(0);
                    let status_raw = slot["status"].as_str().unwrap_or("unknown");
                    let status = match status_raw {
                        "Completed" => "completed",
                        "Failed" => "failed",
                        "Extracting" => "extracting",
                        "Repairing" => "repairing",
                        "Verifying" => "verifying",
                        "Moving" => "moving",
                        s => s,
                    };

                    let completed_at = slot["completed"].as_u64().map(|ts| {
                        chrono::DateTime::from_timestamp(ts as i64, 0)
                            .map(|dt| dt.format("%Y-%m-%d %H:%M").to_string())
                            .unwrap_or_default()
                    });

                    history.push(DownloadHistoryItem {
                        name: slot["name"].as_str().unwrap_or("Unknown").to_string(),
                        status: status.to_lowercase(),
                        size: bytes,
                        completed_at,
                        client_name: String::new(),
                        client_type: "sabnzbd".to_string(),
                    });
                }
            }
        }
    }

    Ok(ClientDownloads { paused, queue, history })
}
