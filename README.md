<p align="center">
  <img src="public/newron-logo.png" alt="Cortex Logo" width="120" />
</p>

<h1 align="center">Cortex</h1>

<p align="center">
  A powerful web crawler with a desktop UI and modern CLI, built on Electron and Puppeteer.
</p>

<p align="center">
  <a href="#features">Features</a> &bull;
  <a href="#installation">Installation</a> &bull;
  <a href="#desktop-app">Desktop App</a> &bull;
  <a href="#cli">CLI</a> &bull;
  <a href="#configuration">Configuration</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="#contributing">Contributing</a> &bull;
  <a href="#license">License</a>
</p>

<p align="center">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue.svg" />
  <img alt="Electron" src="https://img.shields.io/badge/electron-32-47848F.svg?logo=electron" />
  <img alt="React" src="https://img.shields.io/badge/react-18-61DAFB.svg?logo=react" />
  <img alt="Bun" src="https://img.shields.io/badge/bun-%E2%89%A5%201.0-F9F1E1.svg?logo=bun" />
  <img alt="Platform" src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg" />
</p>

---

## Features

### Crawling Engine
- **BFS Web Crawling** --- Breadth-first traversal with configurable depth limits
- **Concurrent Page Processing** --- Crawl multiple pages simultaneously (1--10 workers)
- **Stealth Mode** --- Puppeteer stealth plugin to avoid bot detection
- **Pause / Resume** --- Pause a crawl mid-run and resume later, even after restarting the app
- **Stop / Cancel** --- Abort a crawl at any time with graceful browser cleanup
- **Domain Bounding** --- Optionally restrict crawling to the starting domain
- **URL Exclusion Patterns** --- Skip URLs matching regex or substring patterns
- **PDF Download Interception** --- Detects and downloads linked PDF files

### Output Formats
- **PDF** --- Save each crawled page as an A4 PDF document
- **Screenshot (PNG)** --- Capture full-page screenshots
- **HTML Snapshot** --- Save the rendered HTML source of each page
- **Markdown** --- Convert page content to clean Markdown via Turndown

All formats are independently toggleable --- enable any combination in Settings or via CLI flags.

### Broken Link Detection
- HTTP status codes captured for every crawled URL
- 4xx/5xx responses flagged as **broken** with red status badges
- Dedicated "Broken" filter tab in the links table
- Broken link count in the stats dashboard
- Status codes included in CSV/JSON exports

### Export & Output
- **CSV / JSON export** --- Download results with URL, depth, status code, broken flag, and errors
- **Auto-export** --- CLI supports `--export-csv` and `--export-json` flags for unattended runs
- Output files saved to `~/cortex/output/{hostname}/`

### Interfaces
- **Desktop App** --- Electron app with React UI, live progress dashboard, filterable links table, and settings page
- **CLI** --- Modern terminal interface with live dashboard, keyboard controls, and full flag support

---

## Installation

### Prerequisites

| Requirement | Version |
|-------------|---------|
| [Bun](https://bun.sh) | >= 1.0.0 |
| [Node.js](https://nodejs.org) | >= 18.0.0 (required by Electron) |

### Setup

```bash
# Clone the repository
git clone https://github.com/newron-ai/cortex.git
cd cortex

# Install dependencies
bun install
```

---

## Desktop App

### Quick Start

1. Launch the app with `bun run dev` (or `bun start` for Electron Forge dev mode).
2. Enter a URL on the home screen and click **Start crawling**.
3. Watch real-time progress --- found links, crawled/skipped/broken counts, and elapsed time.
4. **Pause** to save state and resume later, or **Stop** to abort.
5. When finished, export results as **CSV** or **JSON**, or open the output folder.

### Commands

| Command | Description |
|---------|-------------|
| `bun start` | Start in development mode via Electron Forge |
| `bun run dev` | Build the React app, then launch Electron |
| `bun run build` | Build the React frontend only |
| `bun test` | Run the test suite (Jest + Testing Library) |
| `bun run build:cli` | Bundle CLI into a single minified CJS file (`dist/cortex-cli.cjs`) |
| `bun run package` | Package the app for the current platform |
| `bun run make` | Build distributable installers (DMG, DEB, RPM, ZIP) |

### Screenshots

| Home | Crawling | Links | Settings |
|------|----------|-------|----------|
| *URL input screen* | *Live progress dashboard* | *Filterable links table* | *Crawl configuration* |

---

## CLI

Cortex ships with a full-featured CLI for terminal-based crawling.

```bash
# Run directly
node cli/cortex.js crawl https://example.com

# Or via bun script
bun cli crawl https://example.com

# Or link globally
bun link
cortex crawl https://example.com
```

### Commands

| Command | Description |
|---------|-------------|
| `cortex crawl <url> [options]` | Crawl a website with a live terminal dashboard |
| `cortex resume [options]` | Resume a previously paused crawl |
| `cortex status` | Show info about a saved/paused crawl |
| `cortex discard` | Delete saved crawl state |
| `cortex config --show` | View current configuration |
| `cortex config [options]` | Update default configuration |
| `cortex mcp` | Show MCP server config (copied to clipboard) for connecting AI agents |

### Crawl Options

```
-d, --depth <n>             Max crawl depth (default: from config)
-c, --concurrency <n>       Number of concurrent pages (default: from config)
-m, --max-pages <n>         Maximum pages to crawl (default: from config)
-i, --interval <ms>         Delay between page crawls in ms
-t, --timeout <ms>          Page load timeout in ms
    --no-bound              Allow crawling outside the starting domain
    --no-headless           Show the browser window while crawling
-e, --exclude <patterns>    URL patterns to exclude (regex or substring)
-f, --format <types>        Output formats: pdf, png, html, md
-o, --output <dir>          Custom output directory
    --export-csv <path>     Export results to CSV on completion
    --export-json <path>    Export results to JSON on completion
```

### Keyboard Controls (during crawl)

| Key | Action |
|-----|--------|
| `p` | Pause crawl (saves state to disk) |
| `r` | Resume paused crawl |
| `q` | Stop crawl |

### Examples

```bash
# Basic crawl with defaults
cortex crawl https://example.com

# Deep crawl with 5 workers, all output formats
cortex crawl https://docs.example.com -d 5 -c 5 -f pdf png html md

# Quick scan for broken links, export results
cortex crawl https://mysite.com -d 3 -m 500 --export-csv broken-report.csv

# Crawl with exclusions and custom output
cortex crawl https://blog.example.com -e '/tag/' '/author/' -o ./crawl-output

# Show visible browser window for debugging
cortex crawl https://example.com --no-headless

# Update default config
cortex config --depth 3 --concurrency 5 --format pdf png

# Resume a paused crawl
cortex resume --export-json results.json
```

---

## MCP Server

Cortex includes a [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server, allowing AI agents (Claude Code, Claude Desktop, etc.) to use the crawler as a tool.

### Setup

```bash
# Generate the MCP config and copy it to clipboard
cortex mcp
```

This prints a JSON configuration block and copies it to your clipboard. Paste it into your MCP client settings:

- **Claude Code:** `~/.claude/settings.json`
- **Claude Desktop (macOS):** `~/Library/Application Support/Claude/claude_desktop_config.json`

The config looks like:

```json
{
  "mcpServers": {
    "cortex-crawler": {
      "command": "node",
      "args": ["/path/to/cortex/cli/mcp-server.js"]
    }
  }
}
```

### MCP Tools

| Tool | Description |
|------|-------------|
| `crawl` | Crawl a website --- accepts URL, depth, concurrency, formats, and all config options. Returns link list with status codes and broken link report |
| `crawl-status` | Check if there is a paused/saved crawl that can be resumed |
| `crawl-resume` | Resume a previously paused crawl |
| `crawl-discard` | Discard saved crawl state |
| `config-show` | Show current Cortex configuration |
| `config-update` | Update configuration --- accepts any config field |

### MCP Resources

| URI | Description |
|-----|-------------|
| `cortex://config` | Current crawler configuration (JSON) |
| `cortex://crawl-state` | Saved/paused crawl state, if any (JSON) |

---

## Configuration

All settings are accessible from the **Settings** page in the desktop app, via `cortex config` in the CLI, or by editing `~/cortex/config.json` directly.

| Option | Default | Description |
|--------|---------|-------------|
| `maxDepth` | `2` | How many link levels deep to crawl |
| `concurrency` | `3` | Number of pages to crawl in parallel |
| `maxPages` | `100` | Maximum total pages to crawl |
| `crawlInterval` | `1000` ms | Delay between page loads (rate limiting) |
| `maxTimeout` | `30000` ms | Maximum time to wait for a page to load |
| `boundToBaseUrl` | `true` | Only crawl links on the same origin |
| `headless` | `true` | Run the browser invisibly |
| `excludePatterns` | `[]` | URL patterns (regex/substring) to skip |
| `outputFormats.pdf` | `true` | Generate PDF for each page |
| `outputFormats.screenshot` | `false` | Capture full-page PNG screenshot |
| `outputFormats.html` | `false` | Save rendered HTML source |
| `outputFormats.markdown` | `false` | Convert page content to Markdown |

### Output Structure

```
~/cortex/output/{hostname}/
  page_1711900000000_a1b2c3.pdf
  page_1711900000000_a1b2c3.png
  page_1711900000000_a1b2c3.html
  page_1711900000000_a1b2c3.md
```

All output formats for a single page share the same base filename.

### Pause State

When a crawl is paused, state is saved to `~/cortex/crawl-state.json`. This file contains the full crawl queue, visited URLs, and progress --- allowing the crawl to resume even after the app or terminal is closed.

---

## Architecture

Cortex uses a **two-process Electron architecture** with a secure IPC bridge, plus a standalone CLI that shares the same crawl engine.

```
┌─────────────────────────────────────────────────────┐
│                   Main Process                       │
│  electron/main.js                                    │
│  ┌───────────────────┐  ┌────────────────────────┐  │
│  │  InitiationHandler│  │  crawlHandler.js        │  │
│  │  (config, folders)│  │  (Puppeteer BFS engine, │  │
│  └───────────────────┘  │   pause/resume, output) │  │
│  ┌───────────────────┐  └────────────────────────┘  │
│  │  OutputGenerator  │  ┌────────────────────────┐  │
│  │  (PDF/PNG/HTML/MD)│  │  CrawlStateManager     │  │
│  └───────────────────┘  │  (pause persistence)   │  │
│                         └────────────────────────┘  │
└──────────────────┬──────────────────────────────────┘
                   │  IPC (channel-whitelisted)
                   │  via preload.js + contextBridge
┌──────────────────┴──────────────────────────────────┐
│                 Renderer Process                     │
│  React 18 + Redux Toolkit + React Router + Tailwind  │
│  ┌──────────┐ ┌──────────┐ ┌───────┐ ┌──────────┐  │
│  │ Home     │ │ Crawling │ │ Links │ │ Settings │  │
│  │ (URL in) │ │ (live)   │ │ (table│ │ (config) │  │
│  └──────────┘ └──────────┘ └───────┘ └──────────┘  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                     CLI                              │
│  cli/cortex.js                                       │
│  ┌───────────────────┐                               │
│  │  CrawlEngine      │  (shared Puppeteer engine)    │
│  │  (EventEmitter)   │                               │
│  └───────────────────┘                               │
│  Live dashboard • Keyboard controls • Auto-export    │
└─────────────────────────────────────────────────────┘
```

### Security Model

- `contextIsolation: true` --- renderer cannot access Node.js APIs
- `nodeIntegration: false` --- no `require()` in renderer code
- **Preload script** (`electron/preload.js`) exposes a whitelisted `window.electronAPI` via `contextBridge`
- Only explicitly listed IPC channels are allowed (send and receive are separately whitelisted)

### IPC Channels

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `crawl` | renderer -> main | Start a crawl with URL |
| `stop-crawl` | renderer -> main | Abort active crawl |
| `pause-crawl` | renderer -> main | Pause active crawl and save state |
| `resume-crawl` | renderer -> main | Resume paused crawl |
| `check-saved-crawl` | renderer -> main | Check for saved crawl state |
| `resume-saved-crawl` | renderer -> main | Resume crawl from disk |
| `discard-saved-crawl` | renderer -> main | Delete saved crawl state |
| `crawl-progress` | main -> renderer | Real-time progress (links + stats) |
| `crawl-finished` | main -> renderer | Crawl completed or stopped |
| `crawl-failed` | main -> renderer | Crawl error message |
| `crawl-paused` | main -> renderer | Crawl paused confirmation |
| `crawl-resumed` | main -> renderer | Crawl resumed confirmation |
| `get-config` / `save-config` | renderer -> main | Read/write config |
| `config-data` | main -> renderer | Config response payload |
| `get-output-path` | renderer -> main | Resolve output directory path |
| `open-folder` | renderer -> main | Open folder in system file manager |
| `window-*` | renderer -> main | Minimize / maximize / close |

### Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop framework | Electron 32 |
| Crawling engine | Puppeteer 23 + puppeteer-extra + stealth plugin |
| Frontend framework | React 18 |
| State management | Redux Toolkit 2 |
| Routing | React Router 6 (hash router) |
| Styling | Tailwind CSS 3 |
| HTML to Markdown | Turndown |
| CLI framework | Commander + Chalk + Ora + log-update |
| Runtime / package manager | Bun |
| Build (renderer) | Craco (CRA override, `web` target) |
| Build (packaging) | Electron Forge 7 |
| Icons | Heroicons 2 |

## Project Structure

```
cortex/
├── cli/                       # CLI interface
│   ├── cortex.js              # CLI entry point (commander)
│   └── crawl-engine.js        # Standalone crawl engine (EventEmitter)
├── electron/                  # Main process
│   ├── main.js                # App entry, window, IPC handlers
│   ├── preload.js             # Secure contextBridge API
│   ├── ipcHandlers/
│   │   ├── main.js            # Handler registry
│   │   └── crawlHandler.js    # Core crawling engine + pause/resume
│   └── src/
│       ├── InitiationHandler.js   # Config & folder management
│       ├── OutputGenerator.js     # Multi-format output (PDF/PNG/HTML/MD)
│       └── CrawlStateManager.js   # Pause state persistence
├── src/                       # Renderer process (React)
│   ├── App.js                 # Router + layout
│   ├── components/
│   │   └── TitleBar.js        # Custom window title bar
│   ├── pages/
│   │   ├── EnterUrlPage.js    # URL input + resume banner
│   │   ├── CrawlingStatusPage.js  # Live dashboard + pause/resume
│   │   ├── LinksPage.js       # Results table + broken link filter
│   │   └── SettingsPage.js    # Config UI + output format toggles
│   ├── store/
│   │   ├── index.js           # Redux store
│   │   └── slices/
│   │       └── appDataSlice.js  # Crawl state slice
│   └── handlers/
│       └── processHandler.js  # IPC -> Redux dispatchers
├── config/
│   └── index.js               # Default config values
├── images/                    # App icons
├── public/                    # Static assets
├── craco.config.js            # Webpack override
├── forge.config.js            # Electron Forge config
├── tailwind.config.js         # Tailwind config
└── package.json
```

## CI/CD

Automated builds are handled by GitHub Actions (`.github/workflows/build.yml`). A release is triggered by pushing a version tag:

```bash
git tag v0.2.0
git push origin v0.2.0
```

### What gets built

| Artifact | Platform | How |
|----------|----------|-----|
| **CLI bundle** (`cortex-cli.cjs`) | All (Node.js) | Bun bundler, single minified CJS file |
| **CLI binaries** | linux-x64, linux-arm64, darwin-x64, darwin-arm64, windows-x64 | `bun build --compile` standalone executables |
| **MCP server** (`cortex-mcp.cjs` + binaries) | Same as CLI | Bundled alongside CLI |
| **Electron DMG** | macOS | Electron Forge |
| **Electron Squirrel** | Windows | Electron Forge |
| **Electron DEB** | Linux (Debian) | Electron Forge |
| **Electron RPM** | Linux (Red Hat) | Electron Forge |
| **Electron ZIP** | All platforms | Electron Forge |

All artifacts are uploaded to the GitHub Release automatically.

> **Note:** CLI binaries require `puppeteer` to be installed separately (it includes a Chromium download). The Electron app bundles Chromium via Puppeteer automatically.

## Contributing

We welcome contributions from the community. To get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes and commit (`git commit -m "feat: add my feature"`)
4. Push to your fork (`git push origin feat/my-feature`)
5. Open a Pull Request

Please use [Conventional Commits](https://www.conventionalcommits.org) for commit messages.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a history of changes.

## License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

Copyright (c) 2023-present [Newron.ai](https://newron.ai)

## Acknowledgements

- [Electron](https://www.electronjs.org) --- Desktop application framework
- [Puppeteer](https://pptr.dev) --- Headless Chrome automation
- [puppeteer-extra](https://github.com/berstend/puppeteer-extra) --- Stealth and plugin ecosystem
- [React](https://react.dev) --- UI framework
- [Redux Toolkit](https://redux-toolkit.js.org) --- State management
- [Tailwind CSS](https://tailwindcss.com) --- Utility-first CSS
- [Heroicons](https://heroicons.com) --- Icons
- [Electron Forge](https://www.electronforge.io) --- Packaging and distribution
- [Commander](https://github.com/tj/commander.js) --- CLI framework
- [Chalk](https://github.com/chalk/chalk) --- Terminal styling
- [Turndown](https://github.com/mixmark-io/turndown) --- HTML to Markdown
