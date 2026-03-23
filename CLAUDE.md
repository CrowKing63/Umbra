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

In dev mode, Vite proxies `/api/v1` → `http://localhost:3847` (configured in `apps/web/vite.config.ts`), so the web dev server handles API calls transparently.

### Web state management

Uses React Context API — no external state library. Three contexts:

- `FileContext` — selected file, editor content/dirty state, isSaving, wordCount, file operations
- `AuthContext` — auth status, settings object, login/logout, session management
- `ThemeContext` — theme switching

Service layer in `apps/web/src/services/`: `fileService.ts`, `historyService.ts`, `searchService.ts`.

### Key web utilities

- `getWordCount(text)` — canonical word count function in `apps/web/src/hooks/useCodeMirror.ts`; do not redefine locally.

### Settings cache

`database.ts` caches settings in a module-level variable. `getSettings()` returns the cache; `updateSettings()` writes to disk and invalidates it. Don't call `loadSettings()` directly.

### App data directory

The server creates `.umbra-data/` relative to its `cwd` (not in the user's document root):
- `settings.json` — persisted settings
- Snapshots for history (managed by `history-service.ts`)

### Desktop server spawn

`apps/desktop/src/main.ts` spawns the server via `utilityProcess.fork()` (not `child_process`). Key env vars passed to the server process:
- `UMBRA_STATIC_PATH` — path to web build output (`process.resourcesPath/web`)
- `UMBRA_DATA_DIR` — app data directory for settings/snapshots
- `NODE_ENV` — environment flag

`waitForServer()` polls the health endpoint with 300ms retries up to 15s timeout before opening the window.

### Tests and linting

Neither is configured yet. `pnpm lint` and any test commands will fail — this is expected. Do not attempt to run them.

## Release automation

Windows installer is built and published automatically via `.github/workflows/release.yml` when a `v*` tag is pushed.

### How to release

```bash
# 버전을 package.json에 직접 바꿀 필요 없음 — CI가 태그에서 자동 추출해서 주입
git tag v1.2.3
git push origin v1.2.3
```

GitHub Actions가 다음을 순서대로 실행:
1. `packages/shared-types` 빌드 (dist/ 검증)
2. `apps/server` 빌드
3. `apps/web` 빌드
4. `apps/desktop` 빌드
5. 태그에서 버전 추출 → `apps/desktop/package.json`에 주입
6. `electron-builder --win --publish=always` → GitHub Release 자동 생성

결과물: `Umbra Setup X.Y.Z.exe` (NSIS 인스톨러) + `Umbra X.Y.Z.exe` (포터블)

### Key decisions (do not revert)

- **`packages/shared-types/dist/`는 git에 커밋**: CI 환경에서 pnpm 심링크를 TypeScript가 탐색하지 못하는 문제 우회. `.gitignore`에 `!packages/shared-types/dist/` 예외 있음.
- **`electron`은 `devDependencies`**: electron-builder는 `dependencies`에 electron이 있으면 빌드를 거부함.
- **`"releaseType": "release"`**: `"draft"`로 두면 GitHub 홈화면 미노출, electron-updater가 업데이트로 인식 안 함.
- **`apps/desktop/assets/icon.ico`**: `png-to-ico`로 생성한 올바른 ICO 포맷. PNG를 .ico로 이름만 바꾸면 electron-builder가 거부함.
- **버전 자동 주입**: `apps/desktop/package.json`의 `"version"` 필드는 CI가 덮어씀. 로컬에서 수동으로 올릴 필요 없음.

### Pending

- Windows 로그온 자동실행: `app.setLoginItemSettings({ openAtLogin })` — Electron API로 구현 가능, 아직 미구현.

## Session work orders

Incremental development is tracked in `docs/umbra-session-work-orders.md` (UMB-01 through UMB-14). Each work order is a self-contained prompt. To continue from a specific milestone:

```text
docs/umbra-session-work-orders.md를 읽고 UMB-08만 수행해줘.
```

Current status: UMB-01 through UMB-14 substantially complete. PDF export is a stub (returns raw markdown; client is responsible for rendering). Windows auto-start (`app.setLoginItemSettings`) is pending.
