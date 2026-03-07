use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppConfig {
    #[serde(default)]
    pub plex: PlexConfig,
    #[serde(default)]
    pub sonarr: SonarrConfig,
    #[serde(default)]
    pub radarr: RadarrConfig,
    #[serde(default)]
    pub download_clients: Vec<DownloadClientConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlexConfig {
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub token: String,
    #[serde(default = "generate_client_id")]
    pub client_id: String,
    /// Plex user ID of the admin who completed initial setup
    #[serde(default)]
    pub admin_user_id: i64,
}

fn generate_client_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

impl Default for PlexConfig {
    fn default() -> Self {
        Self {
            url: String::new(),
            token: String::new(),
            client_id: generate_client_id(),
            admin_user_id: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SonarrConfig {
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub api_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RadarrConfig {
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub api_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadClientConfig {
    pub name: String,
    #[serde(rename = "type")]
    pub client_type: DownloadClientType,
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub api_key: String,
    #[serde(default)]
    pub username: String,
    #[serde(default)]
    pub password: String,
    #[serde(default = "default_true")]
    pub enabled: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DownloadClientType {
    Sabnzbd,
    Nzbget,
    Qbittorrent,
    Transmission,
}

/// A redacted version of AppConfig for API responses (hides secrets)
#[derive(Debug, Serialize)]
pub struct RedactedAppConfig {
    pub plex: RedactedPlexConfig,
    pub sonarr: RedactedSonarrConfig,
    pub radarr: RedactedRadarrConfig,
    pub download_clients: Vec<RedactedDownloadClientConfig>,
}

#[derive(Debug, Serialize)]
pub struct RedactedPlexConfig {
    pub url: String,
    pub has_token: bool,
}

#[derive(Debug, Serialize)]
pub struct RedactedSonarrConfig {
    pub url: String,
    pub has_api_key: bool,
}

#[derive(Debug, Serialize)]
pub struct RedactedRadarrConfig {
    pub url: String,
    pub has_api_key: bool,
}

#[derive(Debug, Serialize)]
pub struct RedactedDownloadClientConfig {
    pub name: String,
    #[serde(rename = "type")]
    pub client_type: DownloadClientType,
    pub url: String,
    pub has_api_key: bool,
    pub has_credentials: bool,
    pub enabled: bool,
}

impl AppConfig {
    pub fn redacted(&self) -> RedactedAppConfig {
        RedactedAppConfig {
            plex: RedactedPlexConfig {
                url: self.plex.url.clone(),
                has_token: !self.plex.token.is_empty(),
            },
            sonarr: RedactedSonarrConfig {
                url: self.sonarr.url.clone(),
                has_api_key: !self.sonarr.api_key.is_empty(),
            },
            radarr: RedactedRadarrConfig {
                url: self.radarr.url.clone(),
                has_api_key: !self.radarr.api_key.is_empty(),
            },
            download_clients: self
                .download_clients
                .iter()
                .map(|c| RedactedDownloadClientConfig {
                    name: c.name.clone(),
                    client_type: c.client_type.clone(),
                    url: c.url.clone(),
                    has_api_key: !c.api_key.is_empty(),
                    has_credentials: !c.username.is_empty() || !c.password.is_empty(),
                    enabled: c.enabled,
                })
                .collect(),
        }
    }
}
