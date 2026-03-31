# Contributing to Cortex

Thank you for your interest in contributing to Cortex! This document provides guidelines and information to help you get started.

## Getting Started

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/cortex.git
   cd cortex
   ```
3. **Install** dependencies:
   ```bash
   npm install
   ```
4. **Create a branch** for your work:
   ```bash
   git checkout -b feat/my-feature
   ```

## Development Workflow

### Running the App

```bash
# Build React frontend + launch Electron
npm run dev

# Or use electron-forge dev mode (requires a prior build)
npm run build && npm start
```

### Running Tests

```bash
npm test
```

### Project Layout

- `electron/` — Main process (Node.js): window management, IPC handlers, Puppeteer crawler
- `src/` — Renderer process (React): UI pages, Redux store, components
- `config/` — Default configuration values

### Key Conventions

- **IPC security** — All renderer ↔ main communication goes through the whitelisted channels in `electron/preload.js`. Never add `nodeIntegration: true` or disable `contextIsolation`.
- **State management** — App state lives in Redux Toolkit slices under `src/store/slices/`. Keep slices focused and minimal.
- **Styling** — Use Tailwind CSS utility classes. No custom CSS files unless absolutely necessary.
- **No Node.js in renderer** — The renderer is built with `target: 'web'`. Use `window.electronAPI` for any system access.

## Making Changes

### Commit Messages

Write clear, descriptive commit messages. Use the imperative mood:

- `Add URL validation to EnterUrlPage`
- `Fix IPC listener cleanup on unmount`
- `Update Puppeteer to v24`

### What Makes a Good Pull Request

- **Focused** — One logical change per PR. Don't bundle unrelated fixes.
- **Tested** — Verify your changes work by running the app end-to-end. Add tests where applicable.
- **Documented** — Update the README or CHANGELOG if your change affects user-facing behavior.
- **Small** — Smaller PRs are easier to review and merge faster.

## Submitting a Pull Request

1. Push your branch to your fork.
2. Open a pull request against the `main` branch.
3. Fill out the PR template with a summary and test plan.
4. Wait for review — a maintainer will respond as soon as possible.

## Reporting Bugs

Open a [GitHub issue](https://github.com/newron-ai/cortex/issues/new?template=bug_report.md) with:

- Steps to reproduce
- Expected vs. actual behavior
- Your OS and Node.js version
- Console output or error messages

## Requesting Features

Open a [GitHub issue](https://github.com/newron-ai/cortex/issues/new?template=feature_request.md) describing:

- The problem you're trying to solve
- Your proposed solution
- Any alternatives you considered

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
