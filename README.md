# Playarr

A self-hosted media dashboard that unifies Plex, Sonarr, Radarr, TMDB, and popular download clients into a single interface. Built with a Rust backend and React frontend.

## Features

- **Plex Integration** — Browse libraries, view metadata, continue watching, on deck, and recently added content
- **Video Player** — HLS.js-based player with direct/transcoded stream support, subtitle & audio track selection, and keyboard shortcuts
- **Discovery** — TMDB-powered trending, upcoming, and recently released content
- **Download Management** — Unified view across SABnzbd, NZBGet, qBittorrent, and Transmission with real-time progress
- **Watch Party** — WebSocket-synchronized playback rooms with play/pause/seek sync and episode queues
- **Sonarr & Radarr** — Proxy endpoints for managing TV series and movies
- **Plex PIN Auth** — Secure authentication via Plex's PIN-based OAuth flow

## Tech Stack

| Layer         | Technology                                       |
|---------------|--------------------------------------------------|
| Backend       | Rust (2024 edition), Actix-web, Tokio, Reqwest   |
| Frontend      | React 18, TypeScript, Vite, Tailwind CSS, HeroUI |
| Data Fetching | @tanstack/react-query                            |
| Video         | HLS.js                                           |
| Animations    | Framer Motion                                    |
| State         | DashMap (watch party rooms), TOML config on disk |

## Prerequisites

- [Rust](https://rustup.rs/) (latest stable, edition 2024)
- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/)
- A running [Plex Media Server](https://www.plex.tv/)

## Getting Started

### Install dependencies

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

This runs `cargo run`, which starts the Actix backend on port **8080** and automatically launches the Vite dev server on port **3000** with HMR.

### Production build

```bash
pnpm build
```

This compiles the TypeScript frontend with Vite (output to `target/wwwroot`) and builds an optimized Rust binary.

### Run the production binary

```bash
./target/release/playarr
```

The server starts on `http://0.0.0.0:8080` and serves the bundled frontend.

## Configuration

On first launch, Playarr creates a config file at:

- **Windows**: `%APPDATA%/playarr/config.toml`
- **Linux/macOS**: `~/.config/playarr/config.toml`

All services can be configured through the **Settings** page in the UI:

| Service          | Required | Purpose                                      |
|------------------|----------|----------------------------------------------|
| Plex             | Yes      | Media server — libraries, playback, metadata |
| Sonarr           | No       | TV series management                         |
| Radarr           | No       | Movie management                             |
| TMDB             | No       | Trending & discovery content                 |
| Download clients | No       | SABnzbd, NZBGet, qBittorrent, Transmission   |

## API

All backend endpoints are scoped under `/api/*`. The frontend proxies requests through Vite in development and serves them directly from Actix in production.

## License

GPL-3.0-or-later
