---
name: Custom issue template
about: Describe this issue template's purpose here.
title: ''
labels: ''
assignees: ''

---

---
name: Bug Report
about: Report a bug or unexpected behavior in Playarr
title: "[BUG] "
labels: bug
assignees: ''
---

## Bug Description

_A clear and concise description of what the bug is._


## Steps to Reproduce

1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior

_A clear description of what you expected to happen._


## Actual Behavior

_A clear description of what actually happened instead._


## Screenshots / Screen Recordings

_If applicable, add screenshots or recordings to help explain the problem._


## Environment

**Deployment:**

| Detail              | Value         |
|---------------------|---------------|
| Playarr Version     | e.g. v0.5.0  |
| Deployment Method   | Docker / Binary / Source |
| Operating System    | e.g. Ubuntu 24.04 / Windows 11 / macOS 15 |
| Architecture        | x86_64 / arm64 |
| Browser             | e.g. Chrome 130, Firefox 133, Safari 18 |

**Connected Services:**

| Service             | Version       | Connected |
|---------------------|---------------|-----------|
| Plex Media Server   |               | Yes / No  |
| Sonarr              |               | Yes / No  |
| Radarr              |               | Yes / No  |
| TMDB API            |               | Yes / No  |
| SABnzbd             |               | Yes / No  |
| NZBGet              |               | Yes / No  |
| qBittorrent         |               | Yes / No  |
| Transmission        |               | Yes / No  |


## Component

_Which part of Playarr is affected? Check all that apply._

- [ ] **Plex Integration** — Libraries, metadata, continue watching, on deck, recently added
- [ ] **Video Player** — HLS.js playback, subtitles, audio tracks, keyboard shortcuts
- [ ] **Discovery** — TMDB trending, upcoming, recently released content
- [ ] **Download Management** — SABnzbd, NZBGet, qBittorrent, Transmission progress/status
- [ ] **Watch Party** — WebSocket sync, room creation, play/pause/seek sync, episode queues
- [ ] **Sonarr / Radarr Proxy** — TV series or movie management endpoints
- [ ] **Authentication** — Plex PIN auth flow, login/logout
- [ ] **Settings / Configuration** — config.toml, settings UI
- [ ] **API (Backend)** — Actix-web endpoints under `/api/*`
- [ ] **UI (Frontend)** — React components, layout, styling, responsiveness
- [ ] **Other** — _(please describe)_


## Relevant Log Output

_Paste any relevant logs from the Rust backend console or browser developer console._

<details>
<summary>Backend Logs</summary>

```
(paste logs here)
```
</details>

<details>
<summary>Browser Console Logs</summary>

```
(paste logs here)
```
</details>

<details>
<summary>Network Requests (if applicable)</summary>

```
(paste failing request/response details here)
```
</details>


## Configuration

_If relevant, share the non-sensitive parts of your `config.toml` (redact API keys, tokens, and URLs with sensitive info)._

<details>
<summary>config.toml (redacted)</summary>

```toml
(paste redacted config here)
```
</details>


## Severity

- [ ] **Critical** — App crashes, data loss, or security issue
- [ ] **Major** — Core feature broken, no workaround
- [ ] **Minor** — Feature partially broken, workaround exists
- [ ] **Cosmetic** — Visual glitch, typo, or minor UI issue


## Additional Context

_Add any other context about the problem here. For example:_
- _Does this happen consistently or intermittently?_
- _Did this work in a previous version?_
- _Are there any workarounds you've found?_
- _Is this related to any existing issue?_
