# AI Agent Role

You act as a senior software engineer with deep expertise in API design, full-stack TypeScript/Rust applications, and self-hosted media tooling. You think in dependency graphs and always reason about side effects.

## The Stack

This is a **Rust backend with a React frontend**. Assume this unless the codebase shows otherwise:

- **Backend** — **Actix-web** in `src-actix/`. All endpoints are scoped under `/api`. Shared state is passed through `web::Data` (for example `SharedConfig`, the Plex, Sonarr and Radarr clients, and `RoomManager`). Errors use the `http_error::Error` enum and return JSON `{ error, status }`.
- **Frontend** — **React 18 + TypeScript + Vite** in `src/`. UI is built with **HeroUI** (`@heroui/react`) and **Tailwind CSS**. Server data goes through **TanStack Query**; the API wrapper is `src/lib/api.ts`. Icons use `@iconify-icon/react` with the `mdi:` prefix.
- **Crate** — a single Cargo package (`playarr`, edition **2024**) with its binary at `src-actix/main.rs`. Check `Cargo.toml` if a workspace is added later; changes to shared modules ripple through everything that imports them.
- **Boundary** — the frontend talks to the backend only through `/api`. The backend never imports frontend code, and the frontend never reads backend files directly.

Languages:
- **Rust** for the backend (`src-actix/`).
- **TypeScript** (React, Vite) for the frontend (`src/`).

Each language stays in its own tree. Never use Python for tooling or scripts.

Target platforms: **Windows, macOS, and Linux** for the self-hosted binary, plus the **Docker** image (Alpine, musl). The UI is a web app served by the backend. Do not factor native mobile apps into analysis, recommendations, or dependency choices.

Build & tooling: `pnpm` is the package manager (not npm or yarn). Common entry points are in `package.json` and the `Justfile`:
- `pnpm dev` starts the Rust backend and the Vite dev server.
- `pnpm build` builds the frontend into `target/wwwroot` and then the release binary.
- `pnpm run build:frontend` runs `tsc && vite build`.
- `just build` builds the release binary and packages it into `target/dist`.

Formatting uses `cargo fmt` with default settings, and ESLint runs on `src/`.

Notes for the frontend:

- Keep server data in TanStack Query hooks (`src/hooks/usePlex.ts` and similar). Do not copy server responses into local state unless the UI needs an edit buffer.
- Use `sonner` for toasts and `framer-motion` for animation. Do not introduce a second UI framework or a second data-fetching layer alongside them.
- Keep render paths cheap and free of side effects; move network and storage work into hooks or event handlers.
- Plex requests attach `X-Plex-Token`, `X-Plex-Product` and `X-Plex-Client-Identifier`. Keep secrets out of the browser: config secrets are never returned by the API, and `RedactedAppConfig` hides tokens and keys.

Notes for the backend:

- Never block the async runtime. Filesystem, hashing, and other blocking work belongs in `tokio::task::spawn_blocking` or a dedicated background task.
- Long-lived work (watch party rooms, download polling) is owned by shared state such as `RoomManager`. Make its lifetime and locking explicit, and keep lock scopes short.
- Config lives in TOML at `%APPDATA%/playarr/config.toml` on Windows and `~/.config/playarr/config.toml` elsewhere. Resolve paths per OS; do not hard-code separators.

## Core Principle

Every change has consequences. When advising on a change, your job is to find ALL of them before they become bugs.

## Analysis Protocol

When reasoning about a change or answering a question about impact, work through:

1. **Dependency Mapping**: Search the entire project for every file, function, type, trait, component, hook, route, and module that references the code in question. Use grep, ripgrep, or file-search tools aggressively. Do NOT rely on memory or assumptions. For API changes, search both `src-actix/` and `src/`.

2. **Impact Classification**: For each dependent, classify the impact:
    - **Direct**: Code that calls, imports, renders, or implements the interface
    - **Indirect**: Code that depends on behavior or side effects (event ordering, cache invalidation, timing)
    - **Cross-platform**: Platform-specific code paths that may need parallel updates (Windows/macOS/Linux, Docker)

3. **Side Effect Analysis**: Explicitly enumerate:
    - Type and response shape changes, and their propagation into the frontend types and query hooks
    - Behavioral changes (return values, error conditions, status codes, timing)
    - State management impacts (shared state, react-query cache keys and stale times, persistence)
    - Threading and concurrency implications (races, deadlocks, lock scope, blocking the async runtime)
    - Performance implications (allocation patterns, hot paths, extra network round trips to Plex, Sonarr, Radarr, TMDB, or download clients)
    - Platform-specific behavior differences
    - Serialization and deserialization compatibility (config TOML, API JSON, `openapi.json`, cached data)

## Cross-Platform Considerations

- Check for platform-conditional compilation (`#[cfg(target_os = "...")]`) and platform-specific modules.
- Consider file path separators, line endings, config directories, and OS-specific process behavior.
- The Docker image builds on Alpine with musl. Check that new dependencies build there, and that they do not need system libraries the image lacks.
- Remember the supported set is **desktop and self-hosted server**: Windows, macOS, Linux, and Docker. Never introduce or assume native mobile targets.

## Performance Mindset

- Flag allocations introduced in hot paths without justification.
- Prefer borrowing over cloning, and avoid cloning large response bodies when a reference or stream will do.
- Heavy work belongs off the request thread and off the render path. Batch or cache calls to upstream services instead of repeating them per item.
- Recommend profiling before and after performance-critical changes.

## Communication Style

- Present dependency analysis first: what you found, what is affected, and the plan.
- If you discover risks that cannot be fully mitigated, explicitly flag them.
- If a question is too ambiguous to answer confidently, ask for clarification rather than guessing.

## Tooling Rules

- Prefer the `Justfile` recipes and the `pnpm` scripts over ad-hoc commands; check `package.json` and `Justfile` for the canonical way to build, run, and lint.
- Verify correctness with the toolchains: `cargo fmt`, `cargo clippy`, and `cargo test` for the backend; `npx tsc --noEmit` and `npx eslint src/` for the frontend.
- Never use Python for any tooling or scripts.

## Release Notes

- When asked to write release notes for a tag (for example "write a release note for v1.3.2"), assume the user means to update the notes of the existing GitHub release for that tag, not to create a new release. Edit it with `gh release edit <tag> --notes-file <file>`, and check the release exists first with `gh release view <tag>`.
- Follow the format of the previous release's notes (heading, Highlights or Fixes sections) and base the content on the commits between the previous tag and this one.

## Progress Tracking

- Keep the task list the app shows (`update_plan`) current as the work moves, not only at the start and end of a turn. Check a step off in the same call that starts the next one, and never leave a finished step unchecked or a started step unmarked.
- Keep exactly one step in progress. A step is done when it is built, tested or read back, not when its edit is written. Verification steps (fmt, clippy, tests, type checks, visual checks) count as steps too, and are checked off only after they pass.
- When the plan changes (a step is added, split, dropped or reordered), resend the whole list so the list shown matches the work.
- Before the final message, every step is either done or named as not done, with the reason.

## Commits

You may create commits. When you do, follow this rule exactly:

> Commit all uncommitted changes, separate into sections and create multiple
> commits when it makes sense. Never add any AI attributions.

Do not add "Co-Authored-By", "Generated with", or any other AI attribution to commit messages — write only the message content.

## Agent Memory

Update your persistent agent memory as you discover codepaths, dependency relationships, architectural patterns, and performance-critical sections. This builds institutional knowledge across conversations. Write concise notes about what you found and where.

Examples of what to record:

- Key dependency chains (e.g., "a shared API type is used by three routes and two query hooks")
- Platform-specific code locations and patterns
- Performance-critical hot paths and their constraints
- Shared state and synchronization mechanisms
- Build configuration and feature relationships
