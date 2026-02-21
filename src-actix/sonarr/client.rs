use reqwest::Client;
use crate::config::SharedConfig;

pub struct SonarrClient {
    pub http: Client,
    pub config: SharedConfig,
}

impl SonarrClient {
    pub fn new(config: SharedConfig) -> Self {
        let http = Client::builder()
            .timeout(std::time::Duration::from_secs(120))
            .build()
            .expect("Failed to create HTTP client");
        Self { http, config }
    }

    fn base_url(&self) -> String {
        let cfg = self.config.read().unwrap();
        cfg.sonarr.url.trim_end_matches('/').to_string()
    }

    fn api_key(&self) -> String {
        let cfg = self.config.read().unwrap();
        cfg.sonarr.api_key.clone()
    }

    pub fn get(&self, path: &str) -> reqwest::RequestBuilder {
        let url = format!("{}/api/v3{}", self.base_url(), path);
        self.http
            .get(&url)
            .header("X-Api-Key", self.api_key())
    }

    pub fn post(&self, path: &str) -> reqwest::RequestBuilder {
        let url = format!("{}/api/v3{}", self.base_url(), path);
        self.http
            .post(&url)
            .header("X-Api-Key", self.api_key())
            .header("Content-Type", "application/json")
    }

    pub fn put(&self, path: &str) -> reqwest::RequestBuilder {
        let url = format!("{}/api/v3{}", self.base_url(), path);
        self.http
            .put(&url)
            .header("X-Api-Key", self.api_key())
            .header("Content-Type", "application/json")
    }
}
