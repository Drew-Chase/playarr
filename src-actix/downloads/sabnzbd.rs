use super::DownloadItem;

pub async fn fetch_downloads(url: &str, api_key: &str) -> anyhow::Result<Vec<DownloadItem>> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;

    let api_url = format!(
        "{}/api?mode=queue&output=json&apikey={}",
        url.trim_end_matches('/'),
        api_key
    );

    let resp: serde_json::Value = client.get(&api_url).send().await?.json().await?;
    let mut items = Vec::new();

    if let Some(slots) = resp["queue"]["slots"].as_array() {
        for slot in slots {
            let mb_left = slot["mbleft"].as_str().unwrap_or("0").parse::<f64>().unwrap_or(0.0);
            let mb_total = slot["mb"].as_str().unwrap_or("0").parse::<f64>().unwrap_or(0.0);
            let progress = if mb_total > 0.0 {
                ((mb_total - mb_left) / mb_total) * 100.0
            } else {
                0.0
            };

            let speed_str = resp["queue"]["kbpersec"].as_str().unwrap_or("0");
            let speed = (speed_str.parse::<f64>().unwrap_or(0.0) * 1024.0) as u64;

            items.push(DownloadItem {
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

    Ok(items)
}
