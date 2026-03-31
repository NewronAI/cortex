# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-03-31

### Added

- **Concurrent crawling** --- configurable parallel page processing (1--10 workers, default 3)
- **Stop / cancel crawl** --- abort button with graceful browser cleanup
- **Settings page** --- full UI for all crawl configuration options
- **URL exclusion patterns** --- skip URLs matching regex or substring patterns
- **Max pages limit** --- cap on total pages crawled (default 100)
- **Export to CSV / JSON** --- download crawl results from the status and links pages
- **Progress bar** with percentage and elapsed time display
- **Custom title bar** --- window controls (minimize / maximize / close) for the frameless window
- **Link filtering and search** --- filter by status (crawled / skipped / pending) and search URLs
- **Status badges** --- colored pill badges in the links table
- **Secure IPC bridge** --- preload script with channel-whitelisted `contextBridge` API
- **`postinstall` script** --- ensures Electron binary is downloaded after `bun install`

### Changed

- **Electron** 24 -> 32
- **Puppeteer** 20 -> 23
- **Redux Toolkit** 1.9 -> 2.5
- **React Redux** 8 -> 9
- **React Router DOM** 6.11 -> 6.28
- **Heroicons** 2.0 -> 2.2
- **Electron Forge** 6 -> 7
- **Tailwind CSS** 3.3 -> 3.4
- **UUID** 9 -> 10
- **Testing Library** packages updated to latest
- Switched runtime and package manager from **npm** to **Bun**
- Webpack target changed from `electron-renderer` to `web` (required for `contextIsolation: true`)
- Default config: `maxDepth` 1 -> 2, `maxTimeout` 10s -> 30s, `crawlInterval` 1200ms -> 1000ms
- Window is now resizable (was fixed 800x550, now 1000x700 with 800x550 minimum)
- Crawl events split into dedicated channels (`crawl-progress`, `crawl-finished`, `crawl-failed`)

### Removed

- `request` and `request-promise-native` --- deprecated; PDF downloads now use native `https`/`http`
- `puppeteer-extra-plugin-recaptcha` --- unused
- `localforage`, `match-sorter`, `sort-by` --- unused dependencies
- `eject` script --- removed to prevent accidental CRA ejection
- `nodeIntegration: true` --- replaced with secure `contextIsolation` model
- Direct `window.require('electron')` calls in renderer --- all IPC goes through preload bridge

### Fixed

- **Security**: renderer process had full Node.js access (`contextIsolation: false`, `nodeIntegration: true`)
- **Deprecated API**: `page.waitForTimeout()` replaced with `setTimeout`-based delay
- **Deprecated API**: `request-promise-native` replaced with native Node.js `https`/`http`
- **IPC listener leaks**: listeners now return cleanup functions, removed on component unmount
- **Broken event flow**: `ipcRenderer.once('crawl')` only caught the first progress event
- **Tailwind purge**: `content` array was empty (no utility classes were generated); `purge` key removed (deprecated in v3)
- **Non-HTTP links**: crawler now skips `mailto:`, `javascript:`, `tel:` etc.
- **File path resolution**: `loadFile` used fragile relative string concatenation; now uses `path.join(__dirname, ...)`
- **Preload sandbox crash**: `require('path')` and `require('os')` fail silently in Electron 20+ sandboxed preloads; moved to main process IPC handlers

## [0.1.0] - 2023-05-08

### Added

- Initial release
- BFS web crawling with Puppeteer and stealth plugin
- PDF generation for crawled pages
- PDF download interception
- Domain-bounded crawling
- Configurable depth and timeouts
- Real-time crawl status page
- Links discovery table
- Electron desktop app with React + Redux + Tailwind CSS
- Cross-platform packaging via Electron Forge
