# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cortex is a desktop web crawler built with Electron + React. It uses Puppeteer (with stealth plugin) to crawl websites via BFS, extract links, and generate PDFs of crawled pages. Supports concurrent crawling, URL exclusion patterns, and configurable depth/limits.

## Commands

Uses **Bun** as runtime and package manager.

```bash
bun install              # Install dependencies
bun start                # Start Electron app in dev mode (electron-forge)
bun run dev              # Build React app with Craco, then launch Electron
bun run build            # Build React frontend only (craco build)
bun test                 # Run tests (react-scripts test, Jest + Testing Library)
bun run package          # Package Electron app for distribution
bun run make             # Build platform installers (DMG, DEB, RPM, ZIP)
```

## Architecture

**Two-process Electron architecture with secure IPC bridge:**

- **Main process** (`electron/`): Node.js backend managing BrowserWindow and Puppeteer crawling. Entry point: `electron/main.js`. Preload script: `electron/preload.js`.
- **Renderer process** (`src/`): React 18 app with Redux Toolkit for state, React Router (hash router) for navigation, Tailwind CSS for styling. Built via Craco with `target: 'web'`.
- **Security model**: `contextIsolation: true`, `nodeIntegration: false`, sandboxed preload. All renderer-to-main communication goes through `window.electronAPI` exposed by the preload script via `contextBridge`. The preload script can only `require('electron')` — no `path`, `os`, or `fs` (Electron 20+ sandbox restriction). Any Node.js work (file paths, shell commands) must go through IPC handlers in the main process.

### IPC Events

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `crawl` | renderer→main | Start crawl with URL |
| `stop-crawl` | renderer→main | Abort active crawl |
| `crawl-progress` | main→renderer | Progress updates (links, stats) |
| `crawl-finished` | main→renderer | Crawl complete/stopped |
| `crawl-failed` | main→renderer | Crawl error |
| `get-config` / `save-config` | renderer→main | Read/write config |
| `config-data` | main→renderer | Config response |
| `get-output-path` | renderer→main (invoke) | Resolve output directory path |
| `open-folder` | renderer→main | Open folder in system file manager |
| `window-*` | renderer→main | Window controls (minimize/maximize/close) |

### Key files

- `electron/preload.js` — Secure contextBridge API (IPC only, no Node.js modules)
- `electron/ipcHandlers/crawlHandler.js` — Core crawling engine (Puppeteer BFS, concurrency, abort, PDF generation, URL filtering)
- `electron/src/InitiationHandler.js` — Manages `~/cortex/config.json` and output folders
- `src/store/slices/appDataSlice.js` — Redux slice: crawl status, progress, links, stats, error state
- `src/pages/` — EnterUrlPage (home), CrawlingStatusPage (live progress + controls), LinksPage (results table + filtering + export), SettingsPage (config UI)
- `src/components/TitleBar.js` — Custom frameless window title bar with controls
- `config/index.js` — Default config values

### Routes

- `/` — URL input + settings link
- `/crawl` — Live progress, stop button, export, elapsed time
- `/links` — Filterable/searchable links table with export
- `/settings` — Configure all crawl options

## Configuration

User config at `~/cortex/config.json` (auto-created). PDFs saved to `~/cortex/output/{hostname}/`.

Key options: maxDepth, concurrency, maxPages, boundToBaseUrl, headless, crawlInterval, maxTimeout, excludePatterns.

## Build Tooling

- **Bun** for dependency management and script execution
- **Craco** overrides CRA webpack with `target: 'web'` (required for `contextIsolation: true`)
- **Electron Forge** packages for all platforms (Squirrel/Windows, DMG/macOS, DEB+RPM/Linux)
- **Tailwind CSS** with PostCSS, dark mode via class strategy
