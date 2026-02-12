use super::DownloadItem;

pub async fn fetch_downloads(url: &str, username: &str, password: &str) -> anyhow::Result<Vec<DownloadItem>> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;

    let base = url.trim_end_matches('/');
    let api_url = if !username.is_empty() {
        format!("{}:{}/jsonrpc", base.replacen("://", &format!("://{}:{}@", username, password), 1), "")
    } else {
        format!("{}/jsonrpc", base)
    };

    // Fetch active downloads
    let resp: serde_json::Value = client
        .post(&api_url)
        .json(&serde_json::json!({
            "method": "listgroups",
            "params": []
        }))
        .send()
        .await?
        .json()
        .await?;

    let mut items = Vec::new();

    if let Some(groups) = resp["result"].as_array() {
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

            items.push(DownloadItem {
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

    Ok(items)
}
