use super::DownloadItem;

pub async fn fetch_downloads(url: &str, username: &str, password: &str) -> anyhow::Result<Vec<DownloadItem>> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;

    let api_url = format!("{}/transmission/rpc", url.trim_end_matches('/'));

    // Transmission requires a session ID - first request gets it via 409
    let mut req = client
        .post(&api_url)
        .json(&serde_json::json!({
            "method": "torrent-get",
            "arguments": {
                "fields": ["name", "totalSize", "percentDone", "rateDownload", "eta", "status", "sizeWhenDone", "downloadedEver"]
            }
        }));

    if !username.is_empty() {
        req = req.basic_auth(username, Some(password));
    }

    let resp = req.send().await?;

    // Handle 409 Conflict (need session ID)
    if resp.status().as_u16() == 409 {
        let session_id = resp
            .headers()
            .get("X-Transmission-Session-Id")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("")
            .to_string();

        let mut retry = client
            .post(&api_url)
            .header("X-Transmission-Session-Id", &session_id)
            .json(&serde_json::json!({
                "method": "torrent-get",
                "arguments": {
                    "fields": ["name", "totalSize", "percentDone", "rateDownload", "eta", "status", "sizeWhenDone", "downloadedEver"]
                }
            }));

        if !username.is_empty() {
            retry = retry.basic_auth(username, Some(password));
        }

        let resp: serde_json::Value = retry.send().await?.json().await?;
        return parse_transmission_response(&resp);
    }

    let body: serde_json::Value = resp.json().await?;
    parse_transmission_response(&body)
}

fn parse_transmission_response(resp: &serde_json::Value) -> anyhow::Result<Vec<DownloadItem>> {
    let mut items = Vec::new();

    if let Some(torrents) = resp["arguments"]["torrents"].as_array() {
        for t in torrents {
            let total_size = t["sizeWhenDone"].as_u64().unwrap_or(0);
            let downloaded = t["downloadedEver"].as_u64().unwrap_or(0);
            let progress = t["percentDone"].as_f64().unwrap_or(0.0) * 100.0;
            let speed = t["rateDownload"].as_u64().unwrap_or(0);
            let eta_secs = t["eta"].as_i64().unwrap_or(-1);
            let eta = if eta_secs > 0 {
                let h = eta_secs / 3600;
                let m = (eta_secs % 3600) / 60;
                let s = eta_secs % 60;
                Some(format!("{:02}:{:02}:{:02}", h, m, s))
            } else {
                None
            };

            // Transmission status codes: 0=stopped, 1=check_wait, 2=checking,
            // 3=download_wait, 4=downloading, 5=seed_wait, 6=seeding
            let status = match t["status"].as_u64().unwrap_or(0) {
                0 => "paused",
                1 | 3 => "queued",
                2 => "checking",
                4 => "downloading",
                5 | 6 => "seeding",
                _ => "unknown",
            };

            items.push(DownloadItem {
                name: t["name"].as_str().unwrap_or("Unknown").to_string(),
                progress,
                speed,
                eta,
                status: status.to_string(),
                size: total_size,
                downloaded,
                client_name: String::new(),
                client_type: "transmission".to_string(),
            });
        }
    }

    Ok(items)
}
