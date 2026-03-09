# Umbra

Local-first Markdown writing server for Windows.

## Structure

```
umbra/
├── apps/
│   ├── desktop/   # Electron shell
│   ├── server/    # Fastify API server
│   └── web/       # React UI
├── packages/
│   └── shared-types/
├── pnpm-workspace.yaml
└── package.json
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Run all apps in development mode
pnpm dev
```

## Building and Running

```bash
# Build all packages
pnpm build

# Type check all packages
pnpm typecheck

# Run desktop app (after building)
cd apps/desktop
pnpm start

# Package desktop app for Windows (requires icon at apps/desktop/build/icon.ico)
cd apps/desktop
pnpm package
```

## Development Ports

- Server: http://localhost:3847
- Web: http://localhost:3848

## Project Structure

```
umbra/
├── apps/
│   ├── desktop/   # Electron shell
│   ├── server/    # Fastify API server
│   └── web/       # React UI
├── packages/
│   └── shared-types/
├── pnpm-workspace.yaml
└── package.json
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run all apps in dev mode |
| `pnpm build` | Build all packages |
| `pnpm typecheck` | Type check all packages |
| `cd apps/desktop && pnpm package` | Package Windows installer |

## Testing the Core Flow

1. Start the server: `cd apps/server && pnpm dev`
2. Start the web UI: `cd apps/web && pnpm dev`
3. Open http://localhost:3848 in browser
4. Select a document root folder (must contain .md or .txt files)
5. Create, edit, and save Markdown documents
6. Test search, history, and export features

## Packaging Notes

- Before packaging, place a Windows icon file at `apps/desktop/build/icon.ico`
- The packaged installer will be created in `apps/desktop/dist/build/`
- Supported installer format: NSIS (one-click or custom install)

## v1 Completion Status

All core features are implemented and type-check passes. Remaining items for v1 release:
- Installer testing on clean Windows environment
- Automated end-to-end test suite
- Performance testing with large vaults
- Documentation for end users
- Telemetry-free diagnostic logging
- Windows startup automation validation
