pub mod models;

use std::path::PathBuf;
use std::sync::{Arc, RwLock};
use log::{info, warn};
use models::AppConfig;

pub type SharedConfig = Arc<RwLock<AppConfig>>;

/// Returns the path to the config file.
/// On Windows: %APPDATA%/playarr/config.toml
/// On Linux/macOS: ~/.config/playarr/config.toml
pub fn config_path() -> PathBuf {
    let base = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    base.join("playarr").join("config.toml")
}

/// Load config from disk, or return default if not found.
pub fn load_config() -> AppConfig {
    let path = config_path();
    if path.exists() {
        match std::fs::read_to_string(&path) {
            Ok(contents) => match toml::from_str::<AppConfig>(&contents) {
                Ok(config) => {
                    info!("Loaded config from {}", path.display());
                    return config;
                }
                Err(e) => {
                    warn!("Failed to parse config at {}: {}", path.display(), e);
                }
            },
            Err(e) => {
                warn!("Failed to read config at {}: {}", path.display(), e);
            }
        }
    } else {
        info!("No config found at {}, using defaults", path.display());
    }
    AppConfig::default()
}

/// Save config to disk.
pub fn save_config(config: &AppConfig) -> anyhow::Result<()> {
    let path = config_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let contents = toml::to_string_pretty(config)?;
    std::fs::write(&path, contents)?;
    info!("Saved config to {}", path.display());
    Ok(())
}

/// Create a shared config instance.
pub fn init_shared_config() -> SharedConfig {
    Arc::new(RwLock::new(load_config()))
}
