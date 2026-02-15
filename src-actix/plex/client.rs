use actix_web::HttpRequest;
use reqwest::Client;
use serde::Serialize;
use crate::config::SharedConfig;
use crate::http_error;

const PLEX_PRODUCT: &str = "Playarr";

#[derive(Debug, Clone, Serialize)]
pub struct PlexUserInfo {
    pub user_id: i64,
    pub username: String,
    pub thumb: String,
}

/// Shared Plex HTTP client that adds standard headers to all requests.
pub struct PlexClient {
    pub http: Client,
    pub config: SharedConfig,
}

impl PlexClient {
    pub fn new(config: SharedConfig) -> Self {
        let http = Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");
        Self { http, config }
    }

    /// Get the base URL from config, trimming trailing slashes.
    fn base_url(&self) -> http_error::Result<String> {
        let cfg = self.config.read().map_err(|e| anyhow::anyhow!("Lock error: {}", e))?;
        let url = cfg.plex.url.trim_end_matches('/').to_string();
        if url.is_empty() {
            return Err(http_error::Error::ServiceUnavailable(
                "Plex server URL is not configured. Go to Settings to set it up.".to_string(),
            ));
        }
        Ok(url)
    }

    /// Get the auth token from config.
    pub fn token(&self) -> String {
        let cfg = self.config.read().unwrap();
        cfg.plex.token.clone()
    }

    /// Get the persistent client identifier from config.
    fn client_id(&self) -> String {
        let cfg = self.config.read().unwrap();
        cfg.plex.client_id.clone()
    }

    /// Build a GET request with standard Plex headers.
    /// Token is sent as a query parameter for local Plex Media Server compatibility.
    pub fn get(&self, path: &str) -> http_error::Result<reqwest::RequestBuilder> {
        let token = self.token();
        if token.is_empty() {
            return Err(http_error::Error::Unauthorized(
                "Not authenticated with Plex. Please sign in first.".to_string(),
            ));
        }
        let url = format!("{}{}", self.base_url()?, path);
        Ok(self.http
            .get(&url)
            .query(&[("X-Plex-Token", &token)])
            .header("X-Plex-Product", PLEX_PRODUCT)
            .header("X-Plex-Client-Identifier", self.client_id())
            .header("Accept", "application/json"))
    }

    /// Build a PUT request with standard Plex headers.
    /// Token is sent as a query parameter for local Plex Media Server compatibility.
    pub fn put(&self, path: &str) -> http_error::Result<reqwest::RequestBuilder> {
        let token = self.token();
        if token.is_empty() {
            return Err(http_error::Error::Unauthorized(
                "Not authenticated with Plex. Please sign in first.".to_string(),
            ));
        }
        let url = format!("{}{}", self.base_url()?, path);
        Ok(self.http
            .put(&url)
            .query(&[("X-Plex-Token", &token)])
            .header("X-Plex-Product", PLEX_PRODUCT)
            .header("X-Plex-Client-Identifier", self.client_id())
            .header("Accept", "application/json"))
    }

    /// Send a Plex API request and parse the JSON response.
    /// Handles non-2xx status codes with clear error messages.
    pub async fn send_json(&self, req: reqwest::RequestBuilder) -> http_error::Result<serde_json::Value> {
        let resp = req.send().await
            .map_err(|e| anyhow::anyhow!("Plex request failed: {}", e))?;

        let status = resp.status();
        if status == reqwest::StatusCode::UNAUTHORIZED {
            return Err(http_error::Error::Unauthorized(
                "Plex rejected the auth token. Please sign in again.".to_string(),
            ));
        }

        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(anyhow::anyhow!(
                "Plex returned HTTP {}: {}",
                status.as_u16(),
                &body[..body.len().min(200)]
            ).into());
        }

        let body: serde_json::Value = resp.json().await
            .map_err(|e| anyhow::anyhow!("Failed to parse Plex JSON response: {}", e))?;
        Ok(body)
    }

    /// Build a GET request for binary content (images, etc.) — no Accept: application/json.
    pub fn get_image(&self, path: &str) -> http_error::Result<reqwest::RequestBuilder> {
        let token = self.token();
        if token.is_empty() {
            return Err(http_error::Error::Unauthorized(
                "Not authenticated with Plex. Please sign in first.".to_string(),
            ));
        }
        let url = format!("{}{}", self.base_url()?, path);
        Ok(self.http
            .get(&url)
            .query(&[("X-Plex-Token", &token)])
            .header("X-Plex-Product", PLEX_PRODUCT)
            .header("X-Plex-Client-Identifier", self.client_id()))
    }

    /// Extract (user_id, token) from the plex_user_token HttpOnly cookie.
    /// Cookie format: "{plex_user_id}:{plex_auth_token}"
    pub fn user_from_request(req: &HttpRequest) -> Option<(i64, String)> {
        req.cookie("plex_user_token").and_then(|c| {
            let (id_str, token) = c.value().split_once(':')?;
            Some((id_str.parse::<i64>().ok()?, token.to_string()))
        })
    }

    /// Extract just the user token from the cookie, if present.
    pub fn user_token_from_request(req: &HttpRequest) -> Option<String> {
        Self::user_from_request(req).map(|(_, t)| t)
    }

    /// Build a GET request using a per-user token (falls back to server token if empty).
    pub fn get_as_user(&self, path: &str, user_token: &str) -> http_error::Result<reqwest::RequestBuilder> {
        let token = if user_token.is_empty() { self.token() } else { user_token.to_string() };
        if token.is_empty() {
            return Err(http_error::Error::Unauthorized(
                "Not authenticated with Plex. Please sign in first.".to_string(),
            ));
        }
        let url = format!("{}{}", self.base_url()?, path);
        Ok(self.http
            .get(&url)
            .query(&[("X-Plex-Token", &token)])
            .header("X-Plex-Product", PLEX_PRODUCT)
            .header("X-Plex-Client-Identifier", self.client_id())
            .header("Accept", "application/json"))
    }

    /// Build a PUT request using a per-user token (falls back to server token if empty).
    pub fn put_as_user(&self, path: &str, user_token: &str) -> http_error::Result<reqwest::RequestBuilder> {
        let token = if user_token.is_empty() { self.token() } else { user_token.to_string() };
        if token.is_empty() {
            return Err(http_error::Error::Unauthorized(
                "Not authenticated with Plex. Please sign in first.".to_string(),
            ));
        }
        let url = format!("{}{}", self.base_url()?, path);
        Ok(self.http
            .put(&url)
            .query(&[("X-Plex-Token", &token)])
            .header("X-Plex-Product", PLEX_PRODUCT)
            .header("X-Plex-Client-Identifier", self.client_id())
            .header("Accept", "application/json"))
    }

    /// Build a request to plex.tv (for auth).
    pub fn plex_tv_post(&self, path: &str) -> reqwest::RequestBuilder {
        let url = format!("https://plex.tv{}", path);
        self.http
            .post(&url)
            .header("X-Plex-Product", PLEX_PRODUCT)
            .header("X-Plex-Client-Identifier", self.client_id())
            .header("Accept", "application/json")
    }

    /// Build a GET request to plex.tv (for auth polling).
    pub fn plex_tv_get(&self, path: &str) -> reqwest::RequestBuilder {
        let url = format!("https://plex.tv{}", path);
        self.http
            .get(&url)
            .header("X-Plex-Product", PLEX_PRODUCT)
            .header("X-Plex-Client-Identifier", self.client_id())
            .header("Accept", "application/json")
    }

    /// Fetch user info from plex.tv using their auth token.
    pub async fn fetch_user_info(&self, user_token: &str) -> http_error::Result<PlexUserInfo> {
        let resp = self.plex_tv_get("/api/v2/user")
            .header("X-Plex-Token", user_token)
            .send()
            .await
            .map_err(|e| anyhow::anyhow!("Failed to fetch user info: {}", e))?;

        if !resp.status().is_success() {
            return Err(http_error::Error::Unauthorized(
                "Failed to authenticate with Plex".to_string(),
            ));
        }

        let body: serde_json::Value = resp.json().await
            .map_err(|e| anyhow::anyhow!("Failed to parse user info: {}", e))?;

        Ok(PlexUserInfo {
            user_id: body["id"].as_i64().unwrap_or(0),
            username: body["username"].as_str()
                .or(body["title"].as_str())
                .unwrap_or("Unknown")
                .to_string(),
            thumb: body["thumb"].as_str().unwrap_or("").to_string(),
        })
    }

    /// Fetch Plex friends list using the admin token.
    pub async fn fetch_friends(&self) -> http_error::Result<Vec<serde_json::Value>> {
        let token = self.token();
        let resp = self.plex_tv_get("/api/v2/friends")
            .header("X-Plex-Token", &token)
            .send()
            .await
            .map_err(|e| anyhow::anyhow!("Failed to fetch Plex friends: {}", e))?;

        if !resp.status().is_success() {
            return Err(anyhow::anyhow!("Plex friends API returned {}", resp.status()).into());
        }

        let body: Vec<serde_json::Value> = resp.json().await
            .map_err(|e| anyhow::anyhow!("Failed to parse friends response: {}", e))?;

        Ok(body)
    }
}
