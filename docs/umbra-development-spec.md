# Umbra Development Specification

## 1. Document Summary

### 1.1 Product Name
Umbra

### 1.2 Product Goal
Umbra is a local-first Markdown writing server that runs on Windows as a lightweight background application. Users access it from any browser over `localhost` or the local network, select a local folder as the document root, and manage Markdown-based writing projects without depending on cloud storage.

### 1.3 Primary Use Cases
- Write and organize Markdown documents from a browser on the same Windows machine.
- Access the same writing workspace from tablets, phones, or Apple Vision Pro Safari through the local network.
- Keep all source content in plain `.md` files inside a user-chosen folder.
- Restore prior file versions from local save history without using Git.

### 1.4 Product Principles
- Local-first: source files remain in the user’s filesystem, not a hosted database.
- Low-friction: background service, auto-start, tray controls, and no required internet connection.
- Writer-focused: minimal UI chrome, fast file switching, large touch-friendly controls.
- Safe-by-default: optional password gate, bounded filesystem access, and version restore.

---

## 2. Scope Definition

### 2.1 In Scope
- Windows desktop host application with tray integration
- Local HTTP server and browser-based editor UI
- Markdown file and folder management inside a configured root
- Auto-save editing workflow
- Full-text and filename search
- Per-file history snapshots and restore
- Export to `.txt`, `.html`, `.pdf`
- Import from `.md` and `.txt`
- Light/dark theme
- Optional password protection

### 2.2 Out of Scope for v1
- Multi-user collaboration
- Cloud sync
- Mobile native apps
- Rich plugin marketplace
- Real-time collaborative editing
- Git integration
- Advanced WYSIWYG editing

---

## 3. Full Feature List with Priority

### 3.1 Must Have

#### Platform and Runtime
- Windows resident app running in background
- System tray menu with status, open UI, settings, and quit actions
- Auto-start on boot/login
- HTTP server reachable via:
  - `http://localhost:<port>`
  - `http://<local-ip>:<port>`
- User can choose and change the document root folder
- Root folder path persists across restarts

#### File Management
- Tree-based navigation for files and folders
- Create file
- Create folder
- Rename file/folder
- Delete file/folder with confirmation
- Open file from tree
- Import `.md` and `.txt` into current folder or chosen destination
- Export current document as `.txt`, `.html`, `.pdf`
- Prevent navigation outside configured root folder

#### Editor
- Markdown text editor with syntax highlighting
- Auto-save while editing
- Manual save action
- Split view or toggle between edit and preview
- Read-only preview rendering
- Word count for current document
- Dirty state indication before auto-save completes

#### Version Control
- Per-file history snapshots
- Snapshot creation on manual save
- Optional interval-based snapshot creation
- History list per file with timestamp
- Restore selected version to current file
- Simple diff display between current content and selected snapshot

#### Search
- Full-text search across all supported documents in root
- Filename search
- Search results show file path and match snippet
- Clicking result opens the file

#### UX
- Clean distraction-free layout
- Large tap targets and spacing for touch-first use
- Responsive layout for desktop, tablet, and Vision Pro browser
- Dark/light theme toggle

#### Security
- Optional password protection for the web UI
- Password required before editor access when enabled
- Session timeout or manual logout

### 3.2 Should Have
- Recent files list
- Collapsible file tree sections
- Drag-and-drop import into file tree
- Keyboard shortcuts for save, search, and quick open
- Search indexing for faster repeat queries
- Conflict warning when file changes on disk outside Umbra
- Unsaved recovery after unexpected shutdown
- Basic settings page for port, theme default, autosave interval, snapshot interval, and password enablement
- Markdown preview enhancements:
  - Code block highlighting
  - Tables
  - Task lists
- PDF export styling template

### 3.3 Nice to Have
- Tag or favorites system
- Outline panel generated from headings
- Backlinks or wiki-link parsing
- Multiple vault/document-root profiles
- Custom CSS theme overrides
- Readability mode for preview
- Search filters by folder or file type
- Local network device access whitelist

---

## 4. Recommended Tech Stack

### 4.1 Recommended Stack Summary
- Host runtime: Node.js 22 LTS
- Desktop wrapper: Electron
- Backend framework: Fastify
- Frontend: React + TypeScript + Vite
- Editor: CodeMirror 6
- Markdown parsing/rendering: `remark` + `remark-gfm` + `rehype` pipeline
- State management: Zustand
- Search indexing: MiniSearch or FlexSearch
- Diff engine: `diff-match-patch` or `jsdiff`
- PDF export: Playwright print-to-PDF or `pdf-lib` with HTML print route
- Password hashing: `argon2`
- Local persistence for settings/index metadata/history metadata: SQLite via `better-sqlite3`

### 4.2 Why Node.js + Electron
- Node.js fits local filesystem-heavy workflows well and has mature Windows support.
- Electron allows one codebase to provide:
  - Tray integration
  - Auto-start registration
  - Local server lifecycle management
  - Native dialogs for selecting the document root
- A browser-served UI remains compatible with desktop browsers and remote local-network browsers.
- Node.js has strong package support for Markdown, file watching, diffing, and export workflows.

### 4.3 Why Fastify
- Faster startup and lower overhead than many larger frameworks.
- Strong TypeScript support.
- Clean plugin model for auth, static serving, and route organization.
- Good fit for a local API server with predictable REST endpoints.

### 4.4 Why React + Vite
- Fast iteration and mature ecosystem.
- Clean component model for file tree, editor, preview, search, and settings.
- Vite keeps development setup lightweight and improves local DX.

### 4.5 Why CodeMirror 6
- Strong Markdown editing support.
- Extensible syntax highlighting and editor behaviors.
- Better touch and embedded-browser handling than many legacy editors.
- Easier to keep bundle size modest relative to some alternatives.

### 4.6 Why SQLite
- Good fit for lightweight local metadata.
- Useful for settings, auth config, history manifest, and optional search caches.
- Keeps file content in `.md` files while allowing non-document state to be managed safely.

### 4.7 Alternative Considered
- Tauri could reduce memory footprint, but Electron is the safer recommendation for v1 because Windows tray/background workflows, webview maturity, and Node-based integrations are simpler to deliver reliably with a small team.

---

## 5. High-Level Architecture

### 5.1 Runtime Components
1. Electron main process
   - Manages app lifecycle, tray, auto-start, folder picker, config bootstrap
2. Local API server
   - Serves REST API and web assets
3. Frontend SPA
   - Runs in any browser on local machine or LAN
4. Filesystem service
   - Reads/writes files, folders, imports, exports, snapshots
5. Search service
   - Builds and updates in-memory or persisted search index
6. History service
   - Creates and restores snapshots
7. Auth service
   - Enforces optional password session

### 5.2 Data Storage Model
- Source documents:
  - Stored as `.md` files in user-selected root folder
- Imported `.txt` files:
  - Stored as `.txt` until converted or edited, depending on design choice
  - Recommended v1 behavior: import `.txt`, then save edited output as `.md` only if explicitly renamed
- App metadata:
  - SQLite database under app data directory
- Snapshot files:
  - Stored under app data directory, keyed by file ID/path hash
- Config:
  - JSON or SQLite-backed settings in app data directory

### 5.3 Recommended Snapshot Strategy
- Keep source folder clean by storing history outside the user document root.
- Snapshot payload includes:
  - file path
  - timestamp
  - content blob
  - content hash
- Retention policy for v1:
  - keep latest 50 snapshots per file
  - prune older entries automatically

### 5.4 Networking Model
- Bind server to:
  - `127.0.0.1`
  - optional `0.0.0.0` when LAN access is enabled
- Show actual local IP in tray/settings UI
- Default port example: `47821`
- Allow user to change port if conflict occurs

---

## 6. Functional Specification

### 6.1 Document Root Management
- On first launch, user is prompted to select a root folder.
- App verifies folder exists and is readable/writable.
- All file operations are sandboxed to this root.
- If the folder becomes unavailable, UI enters degraded state and prompts for re-selection.

### 6.2 File Tree
- Displays nested folders and supported files.
- Supported file types in v1:
  - `.md`
  - `.txt`
- Default sorting:
  - folders first
  - then files
  - alphabetical within each group
- Hidden files/folders are excluded by default.

### 6.3 Editing and Save Behavior
- Opening a file loads its content into editor and preview pipeline.
- Auto-save trigger:
  - debounce after user stops typing, default 1000 ms
- Manual save button:
  - forces immediate disk write
  - triggers history snapshot
- Interval snapshot:
  - configurable default 5 minutes only if content changed since last snapshot
- Crash safety:
  - maintain temporary in-memory state and optional recovery draft until disk write succeeds

### 6.4 Markdown Rendering
- Support CommonMark + GFM subset:
  - headings
  - emphasis
  - lists
  - blockquotes
  - fenced code blocks
  - links
  - tables
  - task lists
- External script execution is never allowed in rendered output.
- Sanitize rendered HTML before preview display.

### 6.5 Search
- Search scope includes all files under root with supported extensions.
- Index updates when:
  - file is created
  - file changes
  - file is deleted
  - root folder is rescanned on startup
- Search result data:
  - file name
  - relative path
  - snippet
  - match type (`filename` or `content`)

### 6.6 Import
- User chooses one or more `.md` or `.txt` files.
- Imported files are copied into selected destination folder within root.
- Name collisions prompt:
  - overwrite
  - keep both with suffix
  - cancel

### 6.7 Export
- `.txt`: plain text export from source content
- `.html`: rendered HTML document with export template
- `.pdf`: generated from HTML print view using consistent stylesheet

### 6.8 Authentication
- Password protection is optional and disabled by default.
- When enabled:
  - user sets password from settings UI
  - password hash stored with `argon2`
  - session cookie or token required for API access
- Recommended v1 LAN security posture:
  - require password if LAN binding is enabled

---

## 7. Non-Functional Requirements

### 7.1 Performance
- Initial app launch to tray ready: under 5 seconds on typical Windows hardware
- File open latency for typical note (<200 KB): under 150 ms
- Search response for common vault sizes (<10,000 files): under 300 ms for indexed queries
- Auto-save write confirmation: under 1 second after debounce for typical note size

### 7.2 Reliability
- No data loss during normal auto-save flow
- Atomic write strategy:
  - write temp file
  - fsync if needed
  - replace original
- Recover gracefully from invalid file paths, locked files, and export failures

### 7.3 Security
- Root path traversal blocked
- Authentication endpoints rate-limited when password is enabled
- Session cookie marked `HttpOnly`
- CSRF mitigation for authenticated state-changing requests
- Sanitize HTML preview and export pipeline

### 7.4 Accessibility and Touch
- Minimum touch target size: 44 px
- High-contrast theme compatibility
- Keyboard navigable core flows
- Responsive layouts for large landscape and tablet portrait viewports

---

## 8. Suggested Project Folder Structure

```text
Umbra/
├─ apps/
│  ├─ desktop/
│  │  ├─ src/
│  │  │  ├─ main/
│  │  │  │  ├─ tray/
│  │  │  │  ├─ lifecycle/
│  │  │  │  ├─ config/
│  │  │  │  └─ electron-main.ts
│  │  │  ├─ preload/
│  │  │  │  └─ index.ts
│  │  │  └─ shared/
│  │  └─ package.json
│  ├─ server/
│  │  ├─ src/
│  │  │  ├─ app.ts
│  │  │  ├─ plugins/
│  │  │  ├─ routes/
│  │  │  │  ├─ auth.ts
│  │  │  │  ├─ files.ts
│  │  │  │  ├─ folders.ts
│  │  │  │  ├─ history.ts
│  │  │  │  ├─ search.ts
│  │  │  │  ├─ export.ts
│  │  │  │  ├─ import.ts
│  │  │  │  └─ settings.ts
│  │  │  ├─ services/
│  │  │  │  ├─ file-service.ts
│  │  │  │  ├─ history-service.ts
│  │  │  │  ├─ search-service.ts
│  │  │  │  ├─ export-service.ts
│  │  │  │  ├─ import-service.ts
│  │  │  │  └─ auth-service.ts
│  │  │  ├─ repositories/
│  │  │  ├─ db/
│  │  │  ├─ types/
│  │  │  └─ utils/
│  │  └─ package.json
│  └─ web/
│     ├─ src/
│     │  ├─ app/
│     │  ├─ pages/
│     │  ├─ components/
│     │  │  ├─ layout/
│     │  │  ├─ file-tree/
│     │  │  ├─ editor/
│     │  │  ├─ preview/
│     │  │  ├─ search/
│     │  │  ├─ history/
│     │  │  └─ settings/
│     │  ├─ hooks/
│     │  ├─ stores/
│     │  ├─ services/
│     │  ├─ styles/
│     │  └─ types/
│     └─ package.json
├─ packages/
│  ├─ shared-types/
│  ├─ shared-config/
│  ├─ markdown/
│  └─ ui/
├─ docs/
│  └─ umbra-development-spec.md
├─ tooling/
│  ├─ scripts/
│  └─ configs/
├─ package.json
├─ pnpm-workspace.yaml
└─ README.md
```

### 8.1 Structure Rationale
- `apps/desktop`: Electron shell and OS integration
- `apps/server`: local API and filesystem/search/history logic
- `apps/web`: browser UI
- `packages/*`: shared contracts and reusable modules
- Monorepo reduces duplication while keeping deployment boundaries clear

---

## 9. API Endpoint Definitions (RESTful)

### 9.1 Conventions
- Base URL: `/api/v1`
- Response format:
  - success: `{ "data": ..., "meta": ... }`
  - error: `{ "error": { "code": "...", "message": "..." } }`
- All file paths in API use root-relative paths
- Auth required only when password protection is enabled

### 9.2 Health and Session

#### `GET /api/v1/health`
- Purpose: service status check
- Response:
  - app version
  - auth enabled
  - root configured
  - LAN enabled

#### `POST /api/v1/auth/login`
- Body:
```json
{
  "password": "string"
}
```
- Result:
  - creates authenticated session

#### `POST /api/v1/auth/logout`
- Result:
  - invalidates current session

#### `GET /api/v1/auth/session`
- Result:
  - returns current auth state

### 9.3 Settings

#### `GET /api/v1/settings`
- Returns:
  - root path summary
  - current port
  - LAN access enabled
  - theme preference
  - autosave interval
  - snapshot interval
  - password enabled

#### `PATCH /api/v1/settings`
- Body example:
```json
{
  "theme": "dark",
  "autosaveIntervalMs": 1000,
  "snapshotIntervalMinutes": 5,
  "lanEnabled": true
}
```

#### `POST /api/v1/settings/root`
- Purpose: update document root
- Body:
```json
{
  "path": "C:\\\\Users\\\\Name\\\\Documents\\\\Vault"
}
```

#### `POST /api/v1/settings/password`
- Purpose: create or update password
- Body:
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

### 9.4 Files and Folders

#### `GET /api/v1/tree`
- Purpose: fetch full file tree
- Query:
  - optional `expandedPaths`

#### `GET /api/v1/files`
- Query:
  - `path`
- Returns:
  - file metadata
  - content
  - word count
  - last modified timestamp

#### `POST /api/v1/files`
- Purpose: create new file
- Body:
```json
{
  "parentPath": "notes",
  "name": "draft.md",
  "content": ""
}
```

#### `PUT /api/v1/files`
- Purpose: save file content
- Body:
```json
{
  "path": "notes/draft.md",
  "content": "# Title",
  "createSnapshot": false
}
```

#### `PATCH /api/v1/files/rename`
- Body:
```json
{
  "path": "notes/draft.md",
  "newName": "chapter-01.md"
}
```

#### `DELETE /api/v1/files`
- Query:
  - `path`

#### `POST /api/v1/folders`
- Body:
```json
{
  "parentPath": "notes",
  "name": "ideas"
}
```

#### `PATCH /api/v1/folders/rename`
- Body:
```json
{
  "path": "notes/ideas",
  "newName": "archive"
}
```

#### `DELETE /api/v1/folders`
- Query:
  - `path`

### 9.5 Search

#### `GET /api/v1/search`
- Query:
  - `q`
  - `scope=all|filename|content`
  - `limit`
- Returns:
  - matched items with snippets and match type

#### `POST /api/v1/search/reindex`
- Purpose: manual full reindex

### 9.6 History

#### `GET /api/v1/history`
- Query:
  - `path`
- Returns:
  - snapshot list with IDs, timestamps, size, hash

#### `POST /api/v1/history/snapshot`
- Purpose: manual snapshot creation
- Body:
```json
{
  "path": "notes/draft.md"
}
```

#### `GET /api/v1/history/:snapshotId`
- Purpose: fetch snapshot content and diff preview data

#### `POST /api/v1/history/:snapshotId/restore`
- Body:
```json
{
  "path": "notes/draft.md"
}
```

### 9.7 Import and Export

#### `POST /api/v1/import`
- Content type:
  - `multipart/form-data`
- Fields:
  - `destinationPath`
  - `files[]`

#### `POST /api/v1/export/txt`
- Body:
```json
{
  "path": "notes/draft.md"
}
```

#### `POST /api/v1/export/html`
- Body:
```json
{
  "path": "notes/draft.md"
}
```

#### `POST /api/v1/export/pdf`
- Body:
```json
{
  "path": "notes/draft.md"
}
```

### 9.8 Suggested Error Codes
- `ROOT_NOT_CONFIGURED`
- `INVALID_PATH`
- `FILE_NOT_FOUND`
- `FOLDER_NOT_FOUND`
- `NAME_CONFLICT`
- `AUTH_REQUIRED`
- `INVALID_PASSWORD`
- `EXPORT_FAILED`
- `IMPORT_FAILED`
- `SNAPSHOT_NOT_FOUND`

---

## 10. UI Screen List and Layout Description

### 10.1 Screen: First Launch / Root Setup
- Purpose:
  - select initial document root
  - optionally enable LAN access
- Layout:
  - centered setup card
  - folder picker primary action
  - port and LAN toggle secondary controls
  - continue button

### 10.2 Screen: Login
- Shown only when password is enabled
- Layout:
  - centered password form
  - product name and current server origin
  - submit button with large tap target

### 10.3 Screen: Main Workspace
- Primary layout:
  - left sidebar: file tree
  - center panel: editor
  - right panel or tab: preview/history/search depending on mode
  - top bar: current file, save state, search, theme toggle, settings
- Responsive behavior:
  - desktop: 3-column or 2-column split
  - tablet/Vision Pro: collapsible sidebar and toggleable side panel
  - small screens: single main panel with bottom or top mode switcher

### 10.4 Screen: Search Overlay / Search Page
- Layout:
  - top search field with large input
  - scope filters
  - results list below with snippet cards
- Behavior:
  - selecting a result opens file and scrolls to match if available

### 10.5 Screen: History Panel
- Layout:
  - timestamped snapshot list on left
  - diff or content preview on right
  - restore button for selected snapshot

### 10.6 Screen: Import/Export Modal
- Import:
  - file picker
  - destination folder selector
  - conflict handling options
- Export:
  - format selector
  - preview of output name
  - download action

### 10.7 Screen: Settings
- Sections:
  - General
  - Storage
  - Network
  - Security
  - Appearance
- Controls:
  - root folder change
  - port
  - LAN enablement
  - autosave interval
  - snapshot interval
  - password enable/change
  - theme preference

### 10.8 System Tray Menu
- Open Umbra
- Copy local URL
- Copy LAN URL
- Toggle LAN access
- Settings
- Quit

---

## 11. UX and Layout Guidelines

### 11.1 Design Direction
- Minimal chrome, content-first composition
- Large readable typography
- High spacing and obvious hit areas
- Clear mode transitions between write, preview, search, and history

### 11.2 Vision Pro Compatibility Considerations
- Buttons and list items sized for gaze + pinch interaction
- Avoid dense toolbars and tiny icons as primary actions
- Use clear panel separation and stronger visual hierarchy
- Keep editor/preview toggles explicit and persistent

### 11.3 Theme System
- Provide light and dark themes at minimum
- Persist user choice locally
- Respect system preference on first launch

---

## 12. Data Model (Suggested)

### 12.1 Settings Table
- `id`
- `root_path`
- `port`
- `lan_enabled`
- `theme`
- `autosave_interval_ms`
- `snapshot_interval_minutes`
- `password_enabled`
- `password_hash`
- `created_at`
- `updated_at`

### 12.2 History Table
- `id`
- `file_path`
- `content_hash`
- `snapshot_file_path`
- `created_at`
- `source_type` (`manual`, `interval`, `restore`)

### 12.3 Search Cache Table (Optional)
- `file_path`
- `last_indexed_at`
- `content_hash`
- `token_count`

---

## 13. Implementation Order / Milestones

### Milestone 1: Foundation and Shell
Goal: app boots reliably as a Windows background host with a reachable web UI shell.

Deliverables:
- Electron app skeleton
- Tray integration
- Auto-start support
- Fastify server bootstrapped
- Web app shell served from local server
- Root folder selection flow
- Settings persistence
- Health endpoint

Exit Criteria:
- User can launch Umbra, select a root folder, and open the UI from `localhost`

### Milestone 2: Core File Operations
Goal: users can navigate and manage files/folders inside the root.

Deliverables:
- File tree API and UI
- Create/rename/delete file
- Create/rename/delete folder
- Safe path validation
- File open/read/write flow
- Auto-save baseline

Exit Criteria:
- User can manage Markdown files entirely from browser UI without leaving the root sandbox

### Milestone 3: Writing Experience
Goal: make Umbra usable as a daily writing tool.

Deliverables:
- CodeMirror Markdown editor
- Syntax highlighting
- Preview pane
- Toggle/split layout
- Word count
- Dirty/save status
- Theme toggle

Exit Criteria:
- User can comfortably write, preview, and auto-save Markdown documents

### Milestone 4: Search and History
Goal: improve retrieval and recovery.

Deliverables:
- Full-text and filename search
- Search UI and result navigation
- Manual save snapshots
- Interval snapshot logic
- History list
- Restore flow
- Simple diff display

Exit Criteria:
- User can search across the vault and restore older versions of a file

### Milestone 5: Import, Export, and Security
Goal: complete the v1 feature set.

Deliverables:
- Import `.md` and `.txt`
- Export `.txt`, `.html`, `.pdf`
- Optional password protection
- Session handling
- LAN access toggle and guardrails
- Settings page completion

Exit Criteria:
- Umbra is usable as a secure local writing server across local browsers

### Milestone 6: Hardening and Release Prep
Goal: stabilize for first public or private beta.

Deliverables:
- Error handling polish
- Performance tuning for larger vaults
- Recovery testing
- Installer/packaging
- Windows startup validation
- Basic telemetry-free diagnostic logging
- Documentation and onboarding

Exit Criteria:
- Stable Windows build with installer and reproducible local setup experience

---

## 14. Risks and Mitigations

### 14.1 Filesystem Race Conditions
- Risk:
  - file changed externally while being edited
- Mitigation:
  - compare mtime/hash before save
  - show overwrite/reload choice

### 14.2 LAN Exposure
- Risk:
  - local network access without adequate protection
- Mitigation:
  - LAN disabled by default
  - recommend mandatory password when LAN enabled
  - show active LAN address clearly

### 14.3 PDF Export Inconsistency
- Risk:
  - output differs across rendering methods
- Mitigation:
  - use a single controlled HTML print template and browser engine

### 14.4 Large Vault Search Performance
- Risk:
  - slow indexing or query latency
- Mitigation:
  - incremental indexing
  - index metadata persistence
  - query limit and snippet truncation

---

## 15. Recommended v1 Decisions

To reduce ambiguity during implementation, the following v1 decisions are recommended:

- Use Electron rather than Tauri.
- Use React + CodeMirror 6 for the editor UI.
- Keep document content on disk as user-managed files only.
- Store history snapshots outside the document root.
- Enable LAN access only by explicit user action.
- Require password setup prompt when LAN access is enabled.
- Support `.md` and `.txt` as readable files in v1; focus editing UX primarily on `.md`.
- Use REST only in v1; do not add WebSocket complexity unless live sync requirements emerge.

---

## 16. Definition of Done for v1

Umbra v1 is complete when:
- The app launches on Windows and can auto-start in the background.
- A user can select a root folder and manage documents entirely from the browser.
- Markdown editing, preview, auto-save, word count, search, and version restore all work reliably.
- Import/export flows cover `.md`, `.txt`, `.html`, and `.pdf`.
- The UI is responsive and usable on local desktop browsers and Vision Pro Safari on the same network.
- Optional password protection secures access when enabled.

