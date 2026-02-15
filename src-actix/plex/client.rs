use std::collections::HashMap;
use std::sync::RwLock;

use actix_web::HttpRequest;
use log::{debug, warn};
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
    /// Cache: user plex.tv token → resolved server access token.
    server_token_cache: RwLock<HashMap<String, String>>,
    /// Cached machineIdentifier of the configured PMS (queried once with admin token).
    machine_id_cache: RwLock<Option<String>>,
}

impl PlexClient {
    pub fn new(config: SharedConfig) -> Self {
        let http = Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");
        Self {
            http,
            config,
            server_token_cache: RwLock::new(HashMap::new()),
            machine_id_cache: RwLock::new(None),
        }
    }

    /// Look up a cached server access token, or resolve one from plex.tv.
    async fn get_or_resolve_server_token(&self, user_plex_tv_token: &str) -> Option<String> {
        // Check cache first
        if let Ok(cache) = self.server_token_cache.read() {
            if let Some(token) = cache.get(user_plex_tv_token) {
                return Some(token.clone());
            }
        }

        // Resolve from plex.tv resources API
        let token = self.resolve_server_access_token(user_plex_tv_token).await?;

        // Cache it
        if let Ok(mut cache) = self.server_token_cache.write() {
            cache.insert(user_plex_tv_token.to_string(), token.clone());
        }

        Some(token)
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

    /// Extract (user_id, plex_tv_token) from the plex_user_token HttpOnly cookie.
    /// Cookie format: "{user_id}:{plex_tv_token}:{server_access_token}"
    /// The plex_tv_token (2nd part) is used for plex.tv API calls (user info, etc.).
    pub fn user_from_request(req: &HttpRequest) -> Option<(i64, String)> {
        req.cookie("plex_user_token").and_then(|c| {
            let parts: Vec<&str> = c.value().splitn(3, ':').collect();
            if parts.len() >= 2 {
                Some((parts[0].parse::<i64>().ok()?, parts[1].to_string()))
            } else {
                None
            }
        })
    }

    /// Extract the server access token from the cookie for local PMS requests.
    /// Returns the 3rd part (server token) if present, otherwise falls back
    /// to the 2nd part (plex.tv token) for backwards compatibility.
    pub fn user_token_from_request(req: &HttpRequest) -> Option<String> {
        req.cookie("plex_user_token").and_then(|c| {
            let parts: Vec<&str> = c.value().splitn(3, ':').collect();
            match parts.len() {
                3 => Some(parts[2].to_string()),
                2 => Some(parts[1].to_string()),
                _ => None,
            }
        })
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

    /// GET a PMS endpoint as a user, with automatic fallback to admin token on 401.
    /// Use this for endpoints where a secondary user's token may be rejected by the PMS.
    pub async fn get_json_as_user(
        &self,
        path: &str,
        user_token: &str,
        extra_query: &[(&str, &str)],
    ) -> http_error::Result<serde_json::Value> {
        let base_url = self.base_url()?;
        let url = format!("{}{}", base_url, path);
        let client_id = self.client_id();

        let token = if user_token.is_empty() { self.token() } else { user_token.to_string() };
        if token.is_empty() {
            return Err(http_error::Error::Unauthorized(
                "Not authenticated with Plex. Please sign in first.".to_string(),
            ));
        }

        let resp = self.http.get(&url)
            .query(&[("X-Plex-Token", token.as_str())])
            .query(extra_query)
            .header("X-Plex-Product", PLEX_PRODUCT)
            .header("X-Plex-Client-Identifier", &client_id)
            .header("Accept", "application/json")
            .send().await
            .map_err(|e| anyhow::anyhow!("Plex request failed: {}", e))?;

        if resp.status() == reqwest::StatusCode::UNAUTHORIZED {
            // First, try resolving a server-specific access token for this user.
            // The token we have may be a plex.tv token that the local PMS doesn't accept.
            if let Some(server_token) = self.get_or_resolve_server_token(&token).await {
                if server_token != token {
                    debug!("Resolved server access token, retrying {} as user", path);
                    let req = self.http.get(&url)
                        .query(&[("X-Plex-Token", server_token.as_str())])
                        .query(extra_query)
                        .header("X-Plex-Product", PLEX_PRODUCT)
                        .header("X-Plex-Client-Identifier", &client_id)
                        .header("Accept", "application/json");
                    return self.send_json(req).await;
                }
            }

            // Last resort: fall back to admin token (loses per-user personalization)
            let admin_token = self.token();
            if !admin_token.is_empty() && admin_token != token {
                warn!("Could not resolve user server token for {}, falling back to admin token", path);
                let req = self.http.get(&url)
                    .query(&[("X-Plex-Token", admin_token.as_str())])
                    .query(extra_query)
                    .header("X-Plex-Product", PLEX_PRODUCT)
                    .header("X-Plex-Client-Identifier", &client_id)
                    .header("Accept", "application/json");
                return self.send_json(req).await;
            }
            return Err(http_error::Error::Unauthorized(
                "Plex rejected the auth token. Please sign in again.".to_string(),
            ));
        }

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(anyhow::anyhow!(
                "Plex returned HTTP {}: {}",
                status.as_u16(),
                &body[..body.len().min(200)]
            ).into());
        }

        resp.json().await
            .map_err(|e| anyhow::anyhow!("Failed to parse Plex JSON response: {}", e).into())
    }

    /// Send a GET-based PMS request as a user, with automatic fallback to admin token on 401.
    /// For PUT/GET requests that don't return JSON (e.g. timeline), checks status and retries.
    pub async fn send_as_user(
        &self,
        path: &str,
        user_token: &str,
        extra_query: &[(&str, &str)],
    ) -> http_error::Result<reqwest::Response> {
        let base_url = self.base_url()?;
        let url = format!("{}{}", base_url, path);
        let client_id = self.client_id();

        let token = if user_token.is_empty() { self.token() } else { user_token.to_string() };
        if token.is_empty() {
            return Err(http_error::Error::Unauthorized(
                "Not authenticated with Plex. Please sign in first.".to_string(),
            ));
        }

        let resp = self.http.get(&url)
            .query(&[("X-Plex-Token", token.as_str())])
            .query(extra_query)
            .header("X-Plex-Product", PLEX_PRODUCT)
            .header("X-Plex-Client-Identifier", &client_id)
            .header("Accept", "application/json")
            .send().await
            .map_err(|e| anyhow::anyhow!("Plex request failed: {}", e))?;

        if resp.status() == reqwest::StatusCode::UNAUTHORIZED {
            // Try resolving the user's server-specific access token first
            if let Some(server_token) = self.get_or_resolve_server_token(&token).await {
                if server_token != token {
                    debug!("Resolved server access token, retrying {} as user", path);
                    return self.http.get(&url)
                        .query(&[("X-Plex-Token", server_token.as_str())])
                        .query(extra_query)
                        .header("X-Plex-Product", PLEX_PRODUCT)
                        .header("X-Plex-Client-Identifier", &client_id)
                        .header("Accept", "application/json")
                        .send().await
                        .map_err(|e| anyhow::anyhow!("Plex request failed: {}", e).into());
                }
            }

            // Last resort: admin token
            let admin_token = self.token();
            if !admin_token.is_empty() && admin_token != token {
                warn!("Could not resolve user server token for {}, falling back to admin token", path);
                return self.http.get(&url)
                    .query(&[("X-Plex-Token", admin_token.as_str())])
                    .query(extra_query)
                    .header("X-Plex-Product", PLEX_PRODUCT)
                    .header("X-Plex-Client-Identifier", &client_id)
                    .header("Accept", "application/json")
                    .send().await
                    .map_err(|e| anyhow::anyhow!("Plex request failed: {}", e).into());
            }
        }

        Ok(resp)
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

    /// Get the machineIdentifier of the configured PMS, cached after first call.
    async fn get_server_machine_id(&self) -> Option<String> {
        // Check cache
        if let Ok(cache) = self.machine_id_cache.read() {
            if let Some(ref id) = *cache {
                return Some(id.clone());
            }
        }

        // Query the PMS root with the admin token
        let token = self.token();
        if token.is_empty() {
            return None;
        }
        let base_url = self.base_url().ok()?;
        let resp = self.http.get(&base_url)
            .query(&[("X-Plex-Token", token.as_str())])
            .header("Accept", "application/json")
            .send().await.ok()?;

        if !resp.status().is_success() {
            warn!("Failed to query PMS for machineIdentifier: HTTP {}", resp.status());
            return None;
        }

        let body: serde_json::Value = resp.json().await.ok()?;
        let id = body["MediaContainer"]["machineIdentifier"].as_str()?.to_string();
        debug!("PMS machineIdentifier: {}", id);

        // Cache it
        if let Ok(mut cache) = self.machine_id_cache.write() {
            *cache = Some(id.clone());
        }

        Some(id)
    }

    /// Resolve a server-specific access token for a shared (non-admin) user.
    /// Queries the local PMS for its machineIdentifier, then queries plex.tv
    /// /api/v2/resources to find the matching server and its accessToken.
    pub async fn resolve_server_access_token(&self, user_plex_tv_token: &str) -> Option<String> {
        let machine_id = self.get_server_machine_id().await;

        let resp = self.plex_tv_get("/api/v2/resources")
            .header("X-Plex-Token", user_plex_tv_token)
            .query(&[("includeHttps", "1"), ("includeRelay", "1")])
            .send()
            .await
            .ok()?;

        if !resp.status().is_success() {
            warn!("plex.tv resources API returned {}", resp.status());
            return None;
        }

        let resources: Vec<serde_json::Value> = resp.json().await.ok()?;

        let servers: Vec<&serde_json::Value> = resources.iter()
            .filter(|r| r["provides"].as_str().unwrap_or("").contains("server"))
            .collect();

        debug!("User has access to {} server(s) on plex.tv", servers.len());

        // Match by machineIdentifier (most reliable)
        if let Some(ref mid) = machine_id {
            for server in &servers {
                if server["clientIdentifier"].as_str() == Some(mid.as_str()) {
                    let token = server["accessToken"].as_str().map(|s| s.to_string());
                    debug!("Matched server by machineIdentifier {}, token present: {}", mid, token.is_some());
                    return token;
                }
            }
            warn!("No server matched machineIdentifier {}", mid);
        }

        // Fallback: if the user has access to exactly one server, use that
        if servers.len() == 1 {
            debug!("Single server fallback");
            return servers[0]["accessToken"].as_str().map(|s| s.to_string());
        }

        None
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
