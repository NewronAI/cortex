# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cortex is a web crawler with both a desktop UI (Electron + React) and a modern CLI. It uses Puppeteer (with stealth plugin) to crawl websites via BFS, extract links, detect broken links, and generate multi-format output (PDF, PNG screenshots, HTML snapshots, Markdown). Supports concurrent crawling, pause/resume with disk persistence, URL exclusion patterns, and configurable depth/limits.

## Commands

Uses **Bun** as runtime and package manager.

```bash
bun install              # Install dependencies
bun start                # Start Electron app in dev mode (electron-forge)
bun run dev              # Build React app with Craco, then launch Electron
bun run build            # Build React frontend only (craco build)
bun test                 # Run tests (react-scripts test, Jest + Testing Library)
bun run build:cli        # Bundle CLI into dist/cortex-cli.cjs (Bun bundler, minified CJS)
bun run package          # Package Electron app for distribution
bun run make             # Build platform installers (DMG, DEB, RPM, ZIP)
bun cli                  # Run CLI (equivalent to node cli/cortex.js)
```

### CLI Usage

```bash
node cli/cortex.js crawl <url> [options]   # Crawl a website
node cli/cortex.js resume                  # Resume a paused crawl
node cli/cortex.js status                  # Check for saved crawl state
node cli/cortex.js discard                 # Delete saved crawl state
node cli/cortex.js config --show           # View configuration
node cli/cortex.js config [flags]          # Update configuration
node cli/cortex.js mcp                     # Show MCP server config (copies to clipboard)
```

## Architecture

**Two-process Electron architecture with secure IPC bridge, plus standalone CLI:**

- **Main process** (`electron/`): Node.js backend managing BrowserWindow and Puppeteer crawling. Entry point: `electron/main.js`. Preload script: `electron/preload.js`.
- **Renderer process** (`src/`): React 18 app with Redux Toolkit for state, React Router (hash router) for navigation, Tailwind CSS for styling. Built via Craco with `target: 'web'`.
- **CLI** (`cli/`): Standalone terminal interface using Commander for arg parsing. `cli/crawl-engine.js` is an EventEmitter-based crawl engine that shares the same OutputGenerator, CrawlStateManager, and InitiationHandler as the Electron app.
- **MCP Server** (`cli/mcp-server.js`): Model Context Protocol server over stdio, exposing crawl tools (crawl, crawl-status, crawl-resume, crawl-discard, config-show, config-update) and resources (cortex://config, cortex://crawl-state) to AI agents. Uses `@modelcontextprotocol/sdk`. Run `cortex mcp` to get the client configuration JSON.
- **Security model**: `contextIsolation: true`, `nodeIntegration: false`, sandboxed preload. All renderer-to-main communication goes through `window.electronAPI` exposed by the preload script via `contextBridge`. The preload script can only `require('electron')` — no `path`, `os`, or `fs` (Electron 20+ sandbox restriction). Any Node.js work (file paths, shell commands) must go through IPC handlers in the main process.

### IPC Events

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `crawl` | renderer→main | Start crawl with URL |
| `stop-crawl` | renderer→main | Abort active crawl |
| `pause-crawl` | renderer→main | Pause active crawl and save state to disk |
| `resume-crawl` | renderer→main | Resume in-session paused crawl |
| `check-saved-crawl` | renderer→main (invoke) | Check for saved crawl state on disk |
| `resume-saved-crawl` | renderer→main | Resume crawl from persisted state |
| `discard-saved-crawl` | renderer→main | Delete saved crawl state |
| `crawl-progress` | main→renderer | Progress updates (links, stats, broken count) |
| `crawl-finished` | main→renderer | Crawl complete/stopped |
| `crawl-failed` | main→renderer | Crawl error |
| `crawl-paused` | main→renderer | Crawl paused confirmation |
| `crawl-resumed` | main→renderer | Crawl resumed confirmation |
| `get-config` / `save-config` | renderer→main | Read/write config |
| `config-data` | main→renderer | Config response |
| `get-output-path` | renderer→main (invoke) | Resolve output directory path |
| `open-folder` | renderer→main | Open folder in system file manager |
| `window-*` | renderer→main | Window controls (minimize/maximize/close) |

### Key files

- `cli/cortex.js` — CLI entry point (Commander + Chalk + Ora + log-update)
- `cli/crawl-engine.js` — Standalone EventEmitter-based crawl engine for CLI
- `cli/mcp-server.js` — MCP server over stdio (tools: crawl, config; resources: cortex://config, cortex://crawl-state)
- `electron/preload.js` — Secure contextBridge API (IPC only, no Node.js modules)
- `electron/ipcHandlers/crawlHandler.js` — Core crawling engine (Puppeteer BFS, concurrency, pause/resume, broken link detection, multi-format output)
- `electron/src/InitiationHandler.js` — Manages `~/cortex/config.json` and output folders
- `electron/src/OutputGenerator.js` — Multi-format output generation (PDF, PNG, HTML, Markdown via Turndown)
- `electron/src/CrawlStateManager.js` — Pause state persistence to `~/cortex/crawl-state.json`
- `src/store/slices/appDataSlice.js` — Redux slice: crawl status (idle/crawling/paused/finished/failed/stopped), progress, links, stats, error state
- `src/pages/` — EnterUrlPage (home + resume banner), CrawlingStatusPage (live progress + pause/resume/stop), LinksPage (results table + broken filter + export), SettingsPage (config UI + output format toggles)
- `src/components/TitleBar.js` — Custom frameless window title bar with controls
- `config/index.js` — Default config values

### Routes

- `/` — URL input + settings link + saved crawl resume banner
- `/crawl` — Live progress, pause/resume/stop buttons, export, elapsed time
- `/links` — Filterable/searchable links table with broken link filter and export
- `/settings` — Configure all crawl options including output formats

## Configuration

User config at `~/cortex/config.json` (auto-created). Output saved to `~/cortex/output/{hostname}/`.

Key options: maxDepth, concurrency, maxPages, boundToBaseUrl, headless, crawlInterval, maxTimeout, excludePatterns, outputFormats (pdf, screenshot, html, markdown).

Pause state saved to `~/cortex/crawl-state.json` — contains full crawl queue, visited URLs, and progress for cross-session resume.

## Build Tooling

- **Bun** for dependency management and script execution
- **Craco** overrides CRA webpack with `target: 'web'` (required for `contextIsolation: true`)
- **Electron Forge** packages for all platforms (Squirrel/Windows, DMG/macOS, DEB+RPM/Linux)
- **Tailwind CSS** with PostCSS, dark mode via class strategy
- **Commander** + **Chalk** + **Ora** + **log-update** for CLI interface
- **Turndown** for HTML-to-Markdown conversion
