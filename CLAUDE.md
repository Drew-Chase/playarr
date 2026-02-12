# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Development (starts Rust backend on :8080 + Vite dev server on :3000)
pnpm dev

# Production build (frontend → target/wwwroot, then cargo build --release)
pnpm build

# Frontend only
pnpm run build:frontend    # tsc && vite build

# Backend only
pnpm run build:api         # cargo build --release
pnpm run run:api           # cargo run --bin playarr

# Type checking
npx tsc --noEmit

# Linting
npx eslint src/

# Run Rust tests
cargo test
```

## Architecture

**Dual-stack app**: Actix-web (Rust) backend serves a React (TypeScript) SPA. In dev mode, `cargo run` auto-starts Vite via `vite-actix`. In production, Vite builds to `target/wwwroot` and Actix serves the bundle.

### Backend (`src-actix/`)

All endpoints are scoped under `/api`. Shared state is passed via Actix `web::Data`:
- `SharedConfig` (`Arc<RwLock<AppConfig>>`) — TOML config at `%APPDATA%/playarr/config.toml` (Windows) or `~/.config/playarr/config.toml`
- `PlexClient`, `SonarrClient`, `RadarrClient` — reqwest-based HTTP clients that read config for URLs/tokens
- `RoomManager` (`DashMap`) — in-memory watch party room state

Module → route mapping in `lib.rs::run()`:
- `auth/` → Plex PIN-based OAuth flow
- `plex/` → libraries, media metadata, hub (on deck/recent), search, timeline, image proxy
- `sonarr/` → series, episodes, calendar, queue proxy
- `radarr/` → movies, calendar, queue proxy
- `discover/` → TMDB trending/upcoming/recent
- `downloads/` → aggregates SABnzbd, NZBGet, qBittorrent, Transmission
- `watch_party/` → WebSocket rooms with play/pause/seek sync
- `settings/` → CRUD for all service configs with redacted GET responses

Errors use `http_error::Error` enum (maps to 400/401/404/500/502/503) returning JSON `{ error, status }`.

### Frontend (`src/`)

Provider stack (in `main.tsx`): QueryClient → ThemeProvider → AuthProvider → PlayerProvider → HeroUIProvider.

Key patterns:
- `@tanstack/react-query` for all server data (30s stale time, 1 retry)
- `src/lib/api.ts` — generic fetch wrapper; `src/lib/plex.ts` — Plex-specific API functions
- `src/hooks/usePlex.ts` — query hooks (`useMetadata`, `useChildren`, `useLibraryItems`, etc.)
- Plex requests attach `X-Plex-Token`, `X-Plex-Product`, `X-Plex-Client-Identifier` headers
- `sonner` for toast notifications
- `framer-motion` for animations
- `hls.js` for transcoded video playback

Routes: `/` (Home), `/library/:key`, `/detail/:id`, `/player/:id`, `/search`, `/discover`, `/downloads`, `/watch-party/:roomId?`, `/settings`

TV navigation hierarchy: Show → Seasons grid → Episodes grid → Episode detail → Player

## Conventions

- Rust edition **2024** (not 2021)
- Package manager: **pnpm** (not npm/yarn)
- UI components: **HeroUI** (`@heroui/react`) with **Tailwind CSS**
- Icons: `@iconify-icon/react` with `mdi:` prefix
- Dark/light theme via Tailwind class strategy; custom colors defined in `tailwind.config.js`
- Never create `nul` files — breaks Windows
- Config secrets are never exposed via API; `RedactedAppConfig` hides tokens/keys
