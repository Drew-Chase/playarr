use super::DownloadItem;

pub async fn fetch_downloads(url: &str) -> anyhow::Result<Vec<DownloadItem>> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;

    let api_url = format!("{}/api/v2/torrents/info?filter=active", url.trim_end_matches('/'));

    let resp: Vec<serde_json::Value> = client
        .get(&api_url)
        .send()
        .await?
        .json()
        .await?;

    let items = resp
        .iter()
        .map(|t| {
            let size = t["size"].as_u64().unwrap_or(0);
            let downloaded = t["downloaded"].as_u64().unwrap_or(0);
            let progress = t["progress"].as_f64().unwrap_or(0.0) * 100.0;
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

            DownloadItem {
                name: t["name"].as_str().unwrap_or("Unknown").to_string(),
                progress,
                speed: dlspeed,
                eta,
                status: status.to_string(),
                size,
                downloaded,
                client_name: String::new(),
                client_type: "qbittorrent".to_string(),
            }
        })
        .collect();

    Ok(items)
}
