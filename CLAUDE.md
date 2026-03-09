# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
pnpm install

# Development (all apps in parallel)
pnpm dev

# Per-app development
cd apps/server && pnpm dev    # tsx watch (port 3847)
cd apps/web && pnpm dev       # vite (port 3848)
cd apps/desktop && pnpm dev   # tsx watch

# Build & type check
pnpm build         # build all
pnpm typecheck     # type check all
pnpm verify        # typecheck + build (use before commits)

# Start built artifacts
cd apps/server && pnpm start    # node dist/index.js
cd apps/desktop && pnpm start   # electron .

# Package Windows installer (requires apps/desktop/build/icon.ico)
cd apps/desktop && pnpm package

# Health check against running server
pnpm test:health
```

## Architecture

pnpm workspace monorepo with three apps and one shared package:

- **`apps/desktop`** — Electron main process. Manages tray, app lifecycle, single-instance enforcement, and spawning the server process. References `@umbra/shared-types`.
- **`apps/server`** — Fastify REST API at `http://localhost:3847`. Handles all filesystem operations, search, history, auth, and settings. All routes live in a single `src/index.ts`.
- **`apps/web`** — React + Vite SPA at `http://localhost:3848` (dev). Production: served as static files from the server. Uses CodeMirror 6 for editing and remark/rehype pipeline for Markdown preview.
- **`packages/shared-types`** — TypeScript interfaces shared between apps (`Settings`, `FileNode`, `FileContent`, `SearchResult`, `Snapshot`, `NetworkInfo`, etc.).

### Data flow

Browser → `GET/POST /api/v1/*` → Fastify handlers (`apps/server/src/index.ts`) → service modules → filesystem

### Key server modules

| File | Purpose |
|------|---------|
| `src/sandbox.ts` | Path safety: `resolvePath()`, `isPathSafe()`, `isAllowedFile()`. All file ops must go through this. |
| `src/database.ts` | Settings persistence as JSON at `{cwd}/.umbra-data/settings.json`. Default port is `3847`. |
| `src/search-service.ts` | In-memory search index; updated on file create/update/delete/rename. |
| `src/history-service.ts` | Snapshot creation and restore; snapshots stored under `.umbra-data/`. |
| `src/auth-service.ts` | argon2 password hashing, cookie-based sessions. |
| `src/network.ts` | Local IP detection for LAN URL computation. |

### Critical constraints

- **Sandbox**: every file operation uses `resolvePath()` from `sandbox.ts`; it returns `null` for any path that escapes the configured root. Always call this before touching the filesystem.
- **Allowed files**: only `.md` and `.txt` — enforced by `isAllowedFile()`.
- **Hidden files**: entries starting with `.` are excluded from tree traversal — enforced by `isHidden()`.
- **Atomic writes**: file saves write to `{path}.tmp` then rename to prevent data loss.
- **File tree sort**: directories first, then files, alphabetical within each group.
- **LAN binding**: server binds to `127.0.0.1` when `lanEnabled: false`, `0.0.0.0` when true. Default is localhost-only.
- **Auth guard**: `requireAuth` preHandler hook in `index.ts` skips `/api/v1/auth/*` and is a no-op when `passwordEnabled: false`.

### API base

All endpoints are under `/api/v1`. Responses follow `{ success: boolean, data?: T, error?: string }`.

`API_BASE` is defined once in `apps/web/src/services/api.ts`; all web service files import it from there.

### Key web utilities

- `getWordCount(text)` — canonical word count function in `apps/web/src/hooks/useCodeMirror.ts`; do not redefine locally.

### Settings cache

`database.ts` caches settings in a module-level variable. `getSettings()` returns the cache; `updateSettings()` writes to disk and invalidates it. Don't call `loadSettings()` directly.

### App data directory

The server creates `.umbra-data/` relative to its `cwd` (not in the user's document root):
- `settings.json` — persisted settings
- Snapshots for history (managed by `history-service.ts`)

## Session work orders

Incremental development is tracked in `docs/umbra-session-work-orders.md` (UMB-01 through UMB-14). Each work order is a self-contained prompt. To continue from a specific milestone:

```text
docs/umbra-session-work-orders.md를 읽고 UMB-08만 수행해줘.
```

Current status: UMB-01 through UMB-13 implemented, UMB-14 (hardening/packaging) partially complete. PDF export is a stub (returns raw markdown; client is responsible for rendering). Windows auto-start and `apps/desktop/build/icon.ico` are still pending.
