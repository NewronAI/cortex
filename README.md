<p align="center">
  <img src="public/newron-logo.png" alt="Cortex Logo" width="120" />
</p>

<h1 align="center">Cortex</h1>

<p align="center">
  A powerful desktop web crawler with a modern UI, built on Electron and Puppeteer.
</p>

<p align="center">
  <a href="#features">Features</a> &bull;
  <a href="#installation">Installation</a> &bull;
  <a href="#usage">Usage</a> &bull;
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

- **BFS Web Crawling** --- Breadth-first traversal with configurable depth limits
- **Concurrent Page Processing** --- Crawl multiple pages simultaneously (configurable 1--10 workers)
- **Stealth Mode** --- Puppeteer stealth plugin to avoid bot detection
- **PDF Generation** --- Automatically saves each crawled page as a PDF
- **PDF Download Interception** --- Detects and downloads linked PDF files
- **Live Progress Dashboard** --- Real-time stats, progress bar, and elapsed time
- **Stop / Cancel** --- Abort a crawl at any time with graceful browser cleanup
- **URL Exclusion Patterns** --- Skip URLs matching regex or substring patterns
- **Domain Bounding** --- Optionally restrict crawling to the starting domain
- **Export Results** --- Download crawl results as CSV or JSON
- **Filterable Links Table** --- Search and filter discovered links by status
- **Settings UI** --- Configure all crawl parameters from the app (no config files needed)
- **Secure Architecture** --- Context-isolated renderer with a whitelisted IPC bridge
- **Cross-Platform** --- Builds for macOS (DMG), Windows (Squirrel), and Linux (DEB/RPM)

## Screenshots

<!-- Replace these with actual screenshots of your running application -->

| Home | Crawling | Links | Settings |
|------|----------|-------|----------|
| *URL input screen* | *Live progress dashboard* | *Filterable links table* | *Crawl configuration* |

> **Tip:** Run the app and take screenshots to replace the placeholders above.

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

# Build the React frontend and launch the app
bun run dev
```

## Usage

### Quick Start

1. Launch the app with `bun run dev` (or `bun start` for electron-forge dev mode).
2. Enter a URL on the home screen and click **Start crawling**.
3. Watch real-time progress on the dashboard --- found links, crawled count, skipped count, and elapsed time.
4. Click **Stop Crawl** at any time to abort gracefully.
5. When finished, export results as **CSV** or **JSON**, or open the output folder to view generated PDFs.

### Available Commands

| Command | Description |
|---------|-------------|
| `bun start` | Start in development mode via Electron Forge |
| `bun run dev` | Build the React app, then launch Electron |
| `bun run build` | Build the React frontend only |
| `bun test` | Run the test suite (Jest + Testing Library) |
| `bun run package` | Package the app for the current platform |
| `bun run make` | Build distributable installers (DMG, DEB, RPM, ZIP) |

## Configuration

All settings are accessible from the **Settings** page in the app. They are persisted to `~/cortex/config.json` and applied on the next crawl.

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

### Output

Crawled pages are saved as PDFs in:

```
~/cortex/output/{hostname}/
```

Each page produces a file like `page_1711900000000_a1b2c3.pdf`.

## Architecture

Cortex uses a **two-process Electron architecture** with a secure IPC bridge:

```
┌─────────────────────────────────────────────────────┐
│                   Main Process                       │
│  electron/main.js                                    │
│  ┌───────────────────┐  ┌────────────────────────┐  │
│  │  InitiationHandler│  │  crawlHandler.js        │  │
│  │  (config, folders)│  │  (Puppeteer, BFS,       │  │
│  └───────────────────┘  │   concurrency, PDFs)    │  │
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
| `crawl-progress` | main -> renderer | Real-time progress (links + stats) |
| `crawl-finished` | main -> renderer | Crawl completed or stopped |
| `crawl-failed` | main -> renderer | Crawl error message |
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
| Runtime / package manager | Bun |
| Build (renderer) | Craco (CRA override, `web` target) |
| Build (packaging) | Electron Forge 7 |
| Icons | Heroicons 2 |

## Project Structure

```
cortex/
├── electron/                  # Main process
│   ├── main.js                # App entry, window, IPC handlers
│   ├── preload.js             # Secure contextBridge API
│   ├── ipcHandlers/
│   │   ├── main.js            # Handler registry
│   │   └── crawlHandler.js    # Core crawling engine
│   └── src/
│       └── InitiationHandler.js  # Config & folder management
├── src/                       # Renderer process (React)
│   ├── App.js                 # Router + layout
│   ├── components/
│   │   └── TitleBar.js        # Custom window title bar
│   ├── pages/
│   │   ├── EnterUrlPage.js    # URL input (home)
│   │   ├── CrawlingStatusPage.js  # Live crawl dashboard
│   │   ├── LinksPage.js       # Results table
│   │   └── SettingsPage.js    # Configuration UI
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
