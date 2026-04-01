#!/usr/bin/env node

const { Command } = require('commander');
const path = require('path');
const fs = require('fs');
const os = require('os');
const CrawlEngine = require('./crawl-engine');
const InitiationHandler = require('../electron/src/InitiationHandler');
const CrawlStateManager = require('../electron/src/CrawlStateManager');

// Dynamic imports for ESM-only packages
let chalk, ora, logUpdate, Table;

async function loadDeps() {
  chalk = (await import('chalk')).default;
  ora = (await import('ora')).default;
  logUpdate = (await import('log-update')).default;
  Table = require('cli-table3');
}

// ─── Formatting Helpers ────────────────────────────────────────────

function formatElapsed(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function progressBar(percent, width = 30) {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return bar;
}

function formatFormats(formats) {
  const active = Object.entries(formats)
    .filter(([, v]) => v)
    .map(([k]) => k.toUpperCase());
  return active.length > 0 ? active.join(', ') : 'None';
}

// ─── Banner ────────────────────────────────────────────────────────

function printBanner() {
  console.log('');
  console.log(chalk.bold.hex('#818cf8')('  ┌─────────────────────────────────────┐'));
  console.log(chalk.bold.hex('#818cf8')('  │') + chalk.bold.white('   🕷  Cortex Web Crawler CLI         ') + chalk.bold.hex('#818cf8')('│'));
  console.log(chalk.bold.hex('#818cf8')('  │') + chalk.dim('      by Newron.ai  •  v0.2.0        ') + chalk.bold.hex('#818cf8')('│'));
  console.log(chalk.bold.hex('#818cf8')('  └─────────────────────────────────────┘'));
  console.log('');
}

// ─── Live Dashboard Renderer ───────────────────────────────────────

function renderDashboard(data) {
  const { stats, currentPath, config, outputDir, status } = data;
  const percent = stats.total > 0
    ? Math.round(((stats.crawled + stats.skipped) / stats.total) * 100)
    : 0;

  const statusIcon = status === 'paused'
    ? chalk.yellow('⏸  PAUSED')
    : status === 'finished'
      ? chalk.green('✓  COMPLETE')
      : status === 'stopped'
        ? chalk.red('■  STOPPED')
        : chalk.cyan('⟳  CRAWLING');

  const lines = [
    '',
    `  ${statusIcon}`,
    '',
    `  ${chalk.dim('Progress')}  ${chalk.hex('#818cf8')(progressBar(percent))}  ${chalk.bold.white(percent + '%')}  ${chalk.dim('•')}  ${chalk.dim(formatElapsed(stats.elapsed))}`,
    '',
    `  ${chalk.green.bold(stats.crawled)} ${chalk.dim('crawled')}  ${chalk.dim('│')}  ${chalk.yellow.bold(stats.skipped)} ${chalk.dim('skipped')}  ${chalk.dim('│')}  ${chalk.red.bold(stats.broken)} ${chalk.dim('broken')}  ${chalk.dim('│')}  ${chalk.white.bold(stats.total)} ${chalk.dim('total')}  ${chalk.dim('│')}  ${chalk.dim.bold(stats.pending)} ${chalk.dim('pending')}`,
    '',
    `  ${chalk.dim('Current')}  ${chalk.white(truncate(currentPath || '—', 70))}`,
    `  ${chalk.dim('Output ')}  ${chalk.dim(outputDir)}`,
    '',
  ];

  if (status === 'crawling') {
    lines.push(`  ${chalk.dim('Press')} ${chalk.white('p')} ${chalk.dim('to pause  •')} ${chalk.white('q')} ${chalk.dim('to stop')}`);
  } else if (status === 'paused') {
    lines.push(`  ${chalk.dim('Press')} ${chalk.white('r')} ${chalk.dim('to resume  •')} ${chalk.white('q')} ${chalk.dim('to stop')}`);
  }

  lines.push('');
  return lines.join('\n');
}

function truncate(str, max) {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + '…';
}

// ─── Export Helpers ────────────────────────────────────────────────

function exportResults(links, format, outputPath) {
  let content;
  if (format === 'json') {
    content = JSON.stringify(links, null, 2);
  } else {
    const header = 'URL,Depth,Crawled,Skipped,StatusCode,Broken,Error\n';
    const rows = links.map(l =>
      `"${l.link}",${l.depth},${l.crawled},${l.skipped || false},${l.statusCode || ''},${l.broken || false},"${l.error || ''}"`
    ).join('\n');
    content = header + rows;
  }
  fs.writeFileSync(outputPath, content, 'utf-8');
}

// ─── Commands ──────────────────────────────────────────────────────

async function crawlCommand(url, opts) {
  await loadDeps();
  printBanner();

  // Validate URL
  try {
    new URL(url);
  } catch {
    console.error(chalk.red('  ✗ Invalid URL. Include the protocol (e.g. https://example.com)'));
    process.exit(1);
  }

  // Build config from defaults + file + CLI flags
  const initHandle = new InitiationHandler();
  const fileConfig = initHandle.getConfig();
  const config = { ...fileConfig };

  if (opts.depth !== undefined) config.maxDepth = parseInt(opts.depth);
  if (opts.concurrency !== undefined) config.concurrency = parseInt(opts.concurrency);
  if (opts.maxPages !== undefined) config.maxPages = parseInt(opts.maxPages);
  if (opts.interval !== undefined) config.crawlInterval = parseInt(opts.interval);
  if (opts.timeout !== undefined) config.maxTimeout = parseInt(opts.timeout);
  if (opts.noBound) config.boundToBaseUrl = false;
  if (opts.bound) config.boundToBaseUrl = true;
  if (opts.noHeadless) config.headless = false;
  if (opts.exclude) config.excludePatterns = [...(config.excludePatterns || []), ...opts.exclude];
  if (opts.output) config.outputDir = path.resolve(opts.output);

  // Output formats
  if (opts.format) {
    const formats = { pdf: false, screenshot: false, html: false, markdown: false };
    for (const f of opts.format) {
      const key = f.toLowerCase();
      if (key === 'png' || key === 'screenshot') formats.screenshot = true;
      else if (key === 'md' || key === 'markdown') formats.markdown = true;
      else if (formats.hasOwnProperty(key)) formats[key] = true;
    }
    config.outputFormats = formats;
  }

  // Print config summary
  const table = new Table({
    chars: { top: '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐', bottom: '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘', left: '│', 'left-mid': '├', mid: '─', 'mid-mid': '┼', right: '│', 'right-mid': '┤', middle: '│' },
    style: { head: [], border: [] },
  });

  table.push(
    [chalk.dim('URL'), chalk.white.bold(url)],
    [chalk.dim('Depth'), chalk.white(config.maxDepth ?? 2)],
    [chalk.dim('Concurrency'), chalk.white(config.concurrency ?? 3)],
    [chalk.dim('Max Pages'), chalk.white(config.maxPages ?? 100)],
    [chalk.dim('Interval'), chalk.white((config.crawlInterval ?? 1000) + 'ms')],
    [chalk.dim('Timeout'), chalk.white((config.maxTimeout ?? 30000) + 'ms')],
    [chalk.dim('Same Domain'), chalk.white((config.boundToBaseUrl ?? true) ? 'Yes' : 'No')],
    [chalk.dim('Headless'), chalk.white((config.headless ?? true) ? 'Yes' : 'No')],
    [chalk.dim('Formats'), chalk.white(formatFormats(config.outputFormats ?? { pdf: true }))],
  );

  if ((config.excludePatterns || []).length > 0) {
    table.push([chalk.dim('Exclude'), chalk.white(config.excludePatterns.join(', '))]);
  }

  console.log(table.toString());
  console.log('');

  // Launch spinner while browser starts
  const spinner = ora({ text: 'Launching browser...', color: 'cyan' }).start();

  const engine = new CrawlEngine();
  let dashboardData = {
    stats: { total: 0, crawled: 0, skipped: 0, broken: 0, pending: 0, elapsed: 0 },
    currentPath: null,
    config,
    outputDir: '',
    status: 'crawling',
  };

  engine.on('start', ({ outputDir }) => {
    dashboardData.outputDir = outputDir;
    spinner.succeed('Browser launched');
    console.log('');
  });

  engine.on('progress', (data) => {
    dashboardData.stats = data.stats;
    dashboardData.currentPath = data.currentPath;
    dashboardData.status = engine.crawlPaused ? 'paused' : 'crawling';
    logUpdate(renderDashboard(dashboardData));
  });

  engine.on('paused', () => {
    dashboardData.status = 'paused';
    logUpdate(renderDashboard(dashboardData));
  });

  engine.on('resumed', () => {
    dashboardData.status = 'crawling';
    logUpdate(renderDashboard(dashboardData));
  });

  // Keyboard input for pause/resume/stop
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (key) => {
      if (key === 'q' || key === '\u0003') {
        engine.stop();
      } else if (key === 'p' && dashboardData.status === 'crawling') {
        engine.pause();
      } else if (key === 'r' && dashboardData.status === 'paused') {
        engine.resume();
      }
    });
  }

  try {
    const result = await engine.run(config, { startUrl: url });
    logUpdate.clear();

    dashboardData.stats = result.stats;
    dashboardData.status = result.aborted ? 'stopped' : 'finished';
    console.log(renderDashboard(dashboardData));

    // Print broken links if any
    const brokenLinks = result.links.filter(l => l.broken);
    if (brokenLinks.length > 0) {
      console.log(chalk.red.bold(`  ⚠  ${brokenLinks.length} Broken Link${brokenLinks.length > 1 ? 's' : ''} Detected:`));
      console.log('');
      const brokenTable = new Table({
        head: [chalk.dim('URL'), chalk.dim('Status')],
        chars: { top: '─', 'top-mid': '┬', 'top-left': '  ┌', 'top-right': '┐', bottom: '─', 'bottom-mid': '┴', 'bottom-left': '  └', 'bottom-right': '┘', left: '  │', 'left-mid': '  ├', mid: '─', 'mid-mid': '┼', right: '│', 'right-mid': '┤', middle: '│' },
        style: { head: [], border: [] },
        colWidths: [65, 10],
      });
      for (const l of brokenLinks.slice(0, 20)) {
        brokenTable.push([chalk.white(truncate(l.link, 62)), chalk.red.bold(l.statusCode || 'Error')]);
      }
      console.log(brokenTable.toString());
      if (brokenLinks.length > 20) {
        console.log(chalk.dim(`  ... and ${brokenLinks.length - 20} more`));
      }
      console.log('');
    }

    // Auto-export if requested
    if (opts.exportCsv) {
      const csvPath = path.resolve(opts.exportCsv);
      exportResults(result.links, 'csv', csvPath);
      console.log(chalk.green(`  ✓ CSV exported to ${csvPath}`));
    }
    if (opts.exportJson) {
      const jsonPath = path.resolve(opts.exportJson);
      exportResults(result.links, 'json', jsonPath);
      console.log(chalk.green(`  ✓ JSON exported to ${jsonPath}`));
    }

    console.log(chalk.dim(`  Output files saved to: ${result.outputDir}`));
    console.log('');

  } catch (e) {
    logUpdate.clear();
    console.error(chalk.red(`  ✗ Crawl failed: ${e.message}`));
    process.exit(1);
  } finally {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
  }
}

async function resumeCommand(opts) {
  await loadDeps();
  printBanner();

  const stateManager = new CrawlStateManager();
  const savedState = stateManager.load();

  if (!savedState) {
    console.log(chalk.yellow('  No paused crawl found.'));
    console.log(chalk.dim('  Start a new crawl with: cortex crawl <url>'));
    console.log('');
    process.exit(0);
  }

  console.log(chalk.white(`  Resuming crawl for ${chalk.bold(savedState.baseURL)}`));
  console.log(chalk.dim(`  ${savedState.stats.crawled} pages crawled, ${savedState.stats.total - savedState.stats.crawled - savedState.stats.skipped} pending`));
  console.log('');

  stateManager.delete();

  const config = savedState.config;
  if (opts.output) config.outputDir = path.resolve(opts.output);

  const spinner = ora({ text: 'Launching browser...', color: 'cyan' }).start();

  const engine = new CrawlEngine();
  let dashboardData = {
    stats: savedState.stats,
    currentPath: null,
    config,
    outputDir: '',
    status: 'crawling',
  };

  engine.on('start', ({ outputDir }) => {
    dashboardData.outputDir = outputDir;
    spinner.succeed('Browser launched — resuming crawl');
    console.log('');
  });

  engine.on('progress', (data) => {
    dashboardData.stats = data.stats;
    dashboardData.currentPath = data.currentPath;
    dashboardData.status = engine.crawlPaused ? 'paused' : 'crawling';
    logUpdate(renderDashboard(dashboardData));
  });

  engine.on('paused', () => {
    dashboardData.status = 'paused';
    logUpdate(renderDashboard(dashboardData));
  });

  engine.on('resumed', () => {
    dashboardData.status = 'crawling';
    logUpdate(renderDashboard(dashboardData));
  });

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (key) => {
      if (key === 'q' || key === '\u0003') engine.stop();
      else if (key === 'p' && dashboardData.status === 'crawling') engine.pause();
      else if (key === 'r' && dashboardData.status === 'paused') engine.resume();
    });
  }

  try {
    const result = await engine.run(config, { resumeState: savedState });
    logUpdate.clear();

    dashboardData.stats = result.stats;
    dashboardData.status = result.aborted ? 'stopped' : 'finished';
    console.log(renderDashboard(dashboardData));

    if (opts.exportCsv) {
      exportResults(result.links, 'csv', path.resolve(opts.exportCsv));
      console.log(chalk.green(`  ✓ CSV exported to ${opts.exportCsv}`));
    }
    if (opts.exportJson) {
      exportResults(result.links, 'json', path.resolve(opts.exportJson));
      console.log(chalk.green(`  ✓ JSON exported to ${opts.exportJson}`));
    }

    console.log(chalk.dim(`  Output files saved to: ${result.outputDir}`));
    console.log('');
  } catch (e) {
    logUpdate.clear();
    console.error(chalk.red(`  ✗ Crawl failed: ${e.message}`));
    process.exit(1);
  } finally {
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.stdin.pause();
  }
}

async function statusCommand() {
  await loadDeps();
  printBanner();

  const stateManager = new CrawlStateManager();
  const saved = stateManager.load();

  if (!saved) {
    console.log(chalk.dim('  No paused crawl found.'));
    console.log('');
    process.exit(0);
  }

  const table = new Table({
    chars: { top: '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐', bottom: '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘', left: '│', 'left-mid': '├', mid: '─', 'mid-mid': '┼', right: '│', 'right-mid': '┤', middle: '│' },
    style: { head: [], border: [] },
  });

  table.push(
    [chalk.dim('URL'), chalk.white.bold(saved.baseURL)],
    [chalk.dim('Paused At'), chalk.white(new Date(saved.savedAt).toLocaleString())],
    [chalk.dim('Crawled'), chalk.green(saved.stats.crawled)],
    [chalk.dim('Skipped'), chalk.yellow(saved.stats.skipped)],
    [chalk.dim('Broken'), chalk.red(saved.stats.broken)],
    [chalk.dim('Total Found'), chalk.white(saved.stats.total)],
    [chalk.dim('Elapsed'), chalk.white(formatElapsed(saved.stats.elapsed))],
  );

  console.log(chalk.white.bold('  Paused Crawl'));
  console.log('');
  console.log(table.toString());
  console.log('');
  console.log(chalk.dim('  Resume with: cortex resume'));
  console.log(chalk.dim('  Discard with: cortex discard'));
  console.log('');
}

async function discardCommand() {
  await loadDeps();
  const stateManager = new CrawlStateManager();

  if (!stateManager.exists()) {
    console.log(chalk.dim('  No paused crawl to discard.'));
    process.exit(0);
  }

  stateManager.delete();
  console.log(chalk.green('  ✓ Saved crawl state discarded.'));
  console.log('');
}

async function configCommand(opts) {
  await loadDeps();
  printBanner();

  const initHandle = new InitiationHandler();
  const config = initHandle.getConfig();

  if (opts.show) {
    const table = new Table({
      chars: { top: '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐', bottom: '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘', left: '│', 'left-mid': '├', mid: '─', 'mid-mid': '┼', right: '│', 'right-mid': '┤', middle: '│' },
      style: { head: [], border: [] },
    });

    table.push(
      [chalk.dim('Max Depth'), chalk.white(config.maxDepth ?? 2)],
      [chalk.dim('Concurrency'), chalk.white(config.concurrency ?? 3)],
      [chalk.dim('Max Pages'), chalk.white(config.maxPages ?? 100)],
      [chalk.dim('Crawl Interval'), chalk.white((config.crawlInterval ?? 1000) + 'ms')],
      [chalk.dim('Page Timeout'), chalk.white((config.maxTimeout ?? 30000) + 'ms')],
      [chalk.dim('Same Domain'), chalk.white((config.boundToBaseUrl ?? true) ? 'Yes' : 'No')],
      [chalk.dim('Headless'), chalk.white((config.headless ?? true) ? 'Yes' : 'No')],
      [chalk.dim('Output Formats'), chalk.white(formatFormats(config.outputFormats ?? { pdf: true }))],
      [chalk.dim('Exclude Patterns'), chalk.white((config.excludePatterns || []).join(', ') || '—')],
    );

    console.log(chalk.white.bold('  Current Configuration'));
    console.log(chalk.dim(`  File: ${path.resolve(os.homedir(), 'cortex', 'config.json')}`));
    console.log('');
    console.log(table.toString());
    console.log('');
    return;
  }

  // Apply updates
  let changed = false;
  if (opts.depth !== undefined) { config.maxDepth = parseInt(opts.depth); changed = true; }
  if (opts.concurrency !== undefined) { config.concurrency = parseInt(opts.concurrency); changed = true; }
  if (opts.maxPages !== undefined) { config.maxPages = parseInt(opts.maxPages); changed = true; }
  if (opts.interval !== undefined) { config.crawlInterval = parseInt(opts.interval); changed = true; }
  if (opts.timeout !== undefined) { config.maxTimeout = parseInt(opts.timeout); changed = true; }
  if (opts.bound !== undefined) { config.boundToBaseUrl = true; changed = true; }
  if (opts.noBound !== undefined) { config.boundToBaseUrl = false; changed = true; }
  if (opts.headless !== undefined) { config.headless = true; changed = true; }
  if (opts.noHeadless !== undefined) { config.headless = false; changed = true; }

  if (opts.format) {
    const formats = { pdf: false, screenshot: false, html: false, markdown: false };
    for (const f of opts.format) {
      const key = f.toLowerCase();
      if (key === 'png' || key === 'screenshot') formats.screenshot = true;
      else if (key === 'md' || key === 'markdown') formats.markdown = true;
      else if (formats.hasOwnProperty(key)) formats[key] = true;
    }
    config.outputFormats = formats;
    changed = true;
  }

  if (changed) {
    initHandle.updateConfigFile(config);
    console.log(chalk.green('  ✓ Configuration updated.'));
    console.log(chalk.dim('  Run `cortex config --show` to view current settings.'));
  } else {
    console.log(chalk.dim('  No changes specified. Use --show to view config or pass flags to update.'));
    console.log(chalk.dim('  Example: cortex config --depth 3 --concurrency 5 --format pdf,png'));
  }
  console.log('');
}

// ─── MCP Server ────────────────────────────────────────────────────

async function mcpCommand() {
  // Resolve the absolute path to the MCP server script
  const mcpServerPath = path.resolve(__dirname, 'mcp-server.js');
  const nodePath = process.argv[0];

  const mcpConfig = {
    mcpServers: {
      'cortex-crawler': {
        command: nodePath,
        args: [mcpServerPath],
      },
    },
  };

  const configJson = JSON.stringify(mcpConfig, null, 2);

  // Copy to clipboard
  let copied = false;
  try {
    const { execSync } = require('child_process');
    if (process.platform === 'darwin') {
      execSync('pbcopy', { input: configJson });
      copied = true;
    } else if (process.platform === 'linux') {
      try {
        execSync('xclip -selection clipboard', { input: configJson });
        copied = true;
      } catch {
        try {
          execSync('xsel --clipboard --input', { input: configJson });
          copied = true;
        } catch {
          // no clipboard tool available
        }
      }
    } else if (process.platform === 'win32') {
      execSync('clip', { input: configJson });
      copied = true;
    }
  } catch {
    // clipboard copy failed silently
  }

  await loadDeps();
  printBanner();

  console.log(chalk.white.bold('  MCP Server Configuration'));
  console.log('');
  console.log(chalk.dim('  Add this to your MCP client settings (e.g. Claude Code, Claude Desktop):'));
  console.log('');

  // Pretty-print the config
  const lines = configJson.split('\n');
  for (const line of lines) {
    console.log(chalk.hex('#818cf8')('  ' + line));
  }

  console.log('');
  if (copied) {
    console.log(chalk.green('  ✓ Copied to clipboard!'));
  }

  console.log('');
  console.log(chalk.dim('  For Claude Code, add to:'));
  console.log(chalk.white('    ~/.claude/settings.json'));
  console.log('');
  console.log(chalk.dim('  For Claude Desktop, add to:'));
  if (process.platform === 'darwin') {
    console.log(chalk.white('    ~/Library/Application Support/Claude/claude_desktop_config.json'));
  } else if (process.platform === 'win32') {
    console.log(chalk.white('    %APPDATA%\\Claude\\claude_desktop_config.json'));
  } else {
    console.log(chalk.white('    ~/.config/claude/claude_desktop_config.json'));
  }

  console.log('');
  console.log(chalk.dim('  Available MCP tools:'));

  const toolTable = new Table({
    chars: { top: '─', 'top-mid': '┬', 'top-left': '  ┌', 'top-right': '┐', bottom: '─', 'bottom-mid': '┴', 'bottom-left': '  └', 'bottom-right': '┘', left: '  │', 'left-mid': '  ├', mid: '─', 'mid-mid': '┼', right: '│', 'right-mid': '┤', middle: '│' },
    style: { head: [], border: [] },
  });
  toolTable.push(
    [chalk.white('crawl'), chalk.dim('Crawl a website and return links + broken link report')],
    [chalk.white('crawl-status'), chalk.dim('Check for a paused/saved crawl')],
    [chalk.white('crawl-resume'), chalk.dim('Resume a paused crawl')],
    [chalk.white('crawl-discard'), chalk.dim('Discard saved crawl state')],
    [chalk.white('config-show'), chalk.dim('View current configuration')],
    [chalk.white('config-update'), chalk.dim('Update configuration')],
  );
  console.log(toolTable.toString());

  console.log('');
  console.log(chalk.dim('  Available MCP resources:'));

  const resTable = new Table({
    chars: { top: '─', 'top-mid': '┬', 'top-left': '  ┌', 'top-right': '┐', bottom: '─', 'bottom-mid': '┴', 'bottom-left': '  └', 'bottom-right': '┘', left: '  │', 'left-mid': '  ├', mid: '─', 'mid-mid': '┼', right: '│', 'right-mid': '┤', middle: '│' },
    style: { head: [], border: [] },
  });
  resTable.push(
    [chalk.white('cortex://config'), chalk.dim('Current crawler configuration (JSON)')],
    [chalk.white('cortex://crawl-state'), chalk.dim('Saved crawl state, if any (JSON)')],
  );
  console.log(resTable.toString());
  console.log('');

  // Now start the MCP server on stdio
  console.log(chalk.dim('  To start the MCP server directly (for testing):'));
  console.log(chalk.white(`    node ${mcpServerPath}`));
  console.log('');
}

// ─── Program ───────────────────────────────────────────────────────

const program = new Command();

program
  .name('cortex')
  .description('Cortex — a modern web crawler by Newron.ai')
  .version('0.2.0');

program
  .command('crawl')
  .description('Crawl a website starting from the given URL')
  .argument('<url>', 'The URL to start crawling from')
  .option('-d, --depth <n>', 'Max crawl depth (default: from config)')
  .option('-c, --concurrency <n>', 'Number of concurrent pages (default: from config)')
  .option('-m, --max-pages <n>', 'Maximum pages to crawl (default: from config)')
  .option('-i, --interval <ms>', 'Delay between page crawls in ms (default: from config)')
  .option('-t, --timeout <ms>', 'Page load timeout in ms (default: from config)')
  .option('--no-bound', 'Allow crawling outside the starting domain')
  .option('--bound', 'Restrict crawling to the starting domain')
  .option('--no-headless', 'Show the browser window while crawling')
  .option('-e, --exclude <pattern...>', 'URL patterns to exclude (regex or substring)')
  .option('-f, --format <types...>', 'Output formats: pdf, png/screenshot, html, md/markdown')
  .option('-o, --output <dir>', 'Output directory for crawled files')
  .option('--export-csv <path>', 'Export results to CSV file on completion')
  .option('--export-json <path>', 'Export results to JSON file on completion')
  .action(crawlCommand);

program
  .command('resume')
  .description('Resume a previously paused crawl')
  .option('-o, --output <dir>', 'Override output directory')
  .option('--export-csv <path>', 'Export results to CSV file on completion')
  .option('--export-json <path>', 'Export results to JSON file on completion')
  .action(resumeCommand);

program
  .command('status')
  .description('Show the status of a paused crawl')
  .action(statusCommand);

program
  .command('discard')
  .description('Discard a previously paused crawl')
  .action(discardCommand);

program
  .command('config')
  .description('View or update default crawl configuration')
  .option('--show', 'Display current configuration')
  .option('-d, --depth <n>', 'Set default max crawl depth')
  .option('-c, --concurrency <n>', 'Set default concurrency')
  .option('-m, --max-pages <n>', 'Set default max pages')
  .option('-i, --interval <ms>', 'Set default crawl interval')
  .option('-t, --timeout <ms>', 'Set default page timeout')
  .option('--bound', 'Enable same-domain restriction by default')
  .option('--no-bound', 'Disable same-domain restriction by default')
  .option('--headless', 'Enable headless mode by default')
  .option('--no-headless', 'Disable headless mode by default')
  .option('-f, --format <types...>', 'Set default output formats: pdf, png, html, md')
  .action(configCommand);

program
  .command('mcp')
  .description('Start the MCP server and show configuration for connecting agents')
  .action(mcpCommand);

program.parse();
