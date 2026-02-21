use super::{ClientDownloads, DownloadHistoryItem, DownloadItem};

pub async fn fetch_downloads(url: &str, username: &str, password: &str) -> anyhow::Result<ClientDownloads> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;

    let base = url.trim_end_matches('/');
    let api_url = if !username.is_empty() {
        format!("{}:{}/jsonrpc", base.replacen("://", &format!("://{}:{}@", username, password), 1), "")
    } else {
        format!("{}/jsonrpc", base)
    };

    // Fetch queue and history in parallel
    let queue_req = client
        .post(&api_url)
        .json(&serde_json::json!({"method": "listgroups", "params": []}))
        .send();
    let history_req = client
        .post(&api_url)
        .json(&serde_json::json!({"method": "history", "params": [false]}))
        .send();

    let (queue_resp, history_resp) = tokio::join!(queue_req, history_req);

    // Parse queue
    let mut queue = Vec::new();
    if let Ok(resp) = queue_resp {
        if let Ok(json) = resp.json::<serde_json::Value>().await {
            if let Some(groups) = json["result"].as_array() {
                for group in groups {
                    let file_size = group["FileSizeMB"].as_f64().unwrap_or(0.0);
                    let remaining = group["RemainingSizeMB"].as_f64().unwrap_or(0.0);
                    let downloaded = file_size - remaining;
                    let progress = if file_size > 0.0 {
                        (downloaded / file_size) * 100.0
                    } else {
                        0.0
                    };

                    let status = match group["Status"].as_str().unwrap_or("") {
                        "DOWNLOADING" => "downloading",
                        "PAUSED" => "paused",
                        "QUEUED" => "queued",
                        "UNPACKING" => "extracting",
                        s => s,
                    };

                    queue.push(DownloadItem {
                        name: group["NZBName"].as_str().unwrap_or("Unknown").to_string(),
                        progress,
                        speed: (group["DownloadRate"].as_f64().unwrap_or(0.0)) as u64,
                        eta: None,
                        status: status.to_string(),
                        size: (file_size * 1024.0 * 1024.0) as u64,
                        downloaded: (downloaded * 1024.0 * 1024.0) as u64,
                        client_name: String::new(),
                        client_type: "nzbget".to_string(),
                    });
                }
            }
        }
    }

    // Parse history
    let mut history = Vec::new();
    if let Ok(resp) = history_resp {
        if let Ok(json) = resp.json::<serde_json::Value>().await {
            if let Some(items) = json["result"].as_array() {
                for item in items.iter().take(50) {
                    let file_size = item["FileSizeMB"].as_f64().unwrap_or(0.0);
                    let status = match item["Status"].as_str().unwrap_or("") {
                        "SUCCESS" | "SUCCESS/ALL" | "SUCCESS/UNPACK" => "completed",
                        "FAILURE" | "FAILURE/UNPACK" | "FAILURE/HEALTH" => "failed",
                        s => s,
                    };

                    let completed_at = item["HistoryTime"].as_u64().map(|ts| {
                        chrono::DateTime::from_timestamp(ts as i64, 0)
                            .map(|dt| dt.format("%Y-%m-%d %H:%M").to_string())
                            .unwrap_or_default()
                    });

                    history.push(DownloadHistoryItem {
                        name: item["NZBName"].as_str().unwrap_or("Unknown").to_string(),
                        status: status.to_lowercase(),
                        size: (file_size * 1024.0 * 1024.0) as u64,
                        completed_at,
                        client_name: String::new(),
                        client_type: "nzbget".to_string(),
                    });
                }
            }
        }
    }

    Ok(ClientDownloads { queue, history })
}
