#!/usr/bin/env node

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const path = require('path');
const fs = require('fs');
const os = require('os');
const CrawlEngine = require('./crawl-engine');
const InitiationHandler = require('../electron/src/InitiationHandler');
const CrawlStateManager = require('../electron/src/CrawlStateManager');

const server = new McpServer({
  name: 'cortex-crawler',
  version: '0.2.0',
});

// ─── Tool: crawl ───────────────────────────────────────────────────

server.tool(
  'crawl',
  'Crawl a website starting from a URL. Returns discovered links with status codes and broken link detection. Output files (PDF/PNG/HTML/MD) are saved to the output directory.',
  {
    url: z.string().describe('The URL to start crawling from (must include protocol, e.g. https://example.com)'),
    depth: z.number().optional().describe('Max crawl depth (default: 2)'),
    concurrency: z.number().optional().describe('Number of concurrent pages (default: 3)'),
    maxPages: z.number().optional().describe('Maximum pages to crawl (default: 100)'),
    interval: z.number().optional().describe('Delay between page crawls in ms (default: 1000)'),
    timeout: z.number().optional().describe('Page load timeout in ms (default: 30000)'),
    boundToBaseUrl: z.boolean().optional().describe('Restrict crawling to the starting domain (default: true)'),
    headless: z.boolean().optional().describe('Run browser invisibly (default: true)'),
    excludePatterns: z.array(z.string()).optional().describe('URL patterns to exclude (regex or substring)'),
    outputFormats: z.object({
      pdf: z.boolean().optional(),
      screenshot: z.boolean().optional(),
      html: z.boolean().optional(),
      markdown: z.boolean().optional(),
    }).optional().describe('Output formats to generate (default: { pdf: true })'),
    outputDir: z.string().optional().describe('Custom output directory'),
  },
  async (args) => {
    try {
      new URL(args.url);
    } catch {
      return { content: [{ type: 'text', text: 'Error: Invalid URL. Include the protocol (e.g. https://example.com)' }], isError: true };
    }

    const initHandle = new InitiationHandler();
    const fileConfig = initHandle.getConfig();
    const config = { ...fileConfig };

    if (args.depth !== undefined) config.maxDepth = args.depth;
    if (args.concurrency !== undefined) config.concurrency = args.concurrency;
    if (args.maxPages !== undefined) config.maxPages = args.maxPages;
    if (args.interval !== undefined) config.crawlInterval = args.interval;
    if (args.timeout !== undefined) config.maxTimeout = args.timeout;
    if (args.boundToBaseUrl !== undefined) config.boundToBaseUrl = args.boundToBaseUrl;
    if (args.headless !== undefined) config.headless = args.headless;
    if (args.excludePatterns) config.excludePatterns = args.excludePatterns;
    if (args.outputFormats) config.outputFormats = { pdf: false, screenshot: false, html: false, markdown: false, ...args.outputFormats };
    if (args.outputDir) config.outputDir = path.resolve(args.outputDir);

    const engine = new CrawlEngine();

    try {
      const result = await engine.run(config, { startUrl: args.url });

      const brokenLinks = result.links.filter(l => l.broken);
      const summary = [
        `Crawl ${result.aborted ? 'stopped' : 'complete'}: ${result.baseURL}`,
        '',
        `Stats:`,
        `  Crawled: ${result.stats.crawled}`,
        `  Skipped: ${result.stats.skipped}`,
        `  Broken:  ${result.stats.broken}`,
        `  Total:   ${result.stats.total}`,
        `  Elapsed: ${Math.round(result.stats.elapsed / 1000)}s`,
        '',
        `Output: ${result.outputDir}`,
      ];

      if (brokenLinks.length > 0) {
        summary.push('', `Broken Links (${brokenLinks.length}):`);
        for (const l of brokenLinks.slice(0, 50)) {
          summary.push(`  [${l.statusCode || 'ERR'}] ${l.link}`);
        }
        if (brokenLinks.length > 50) {
          summary.push(`  ... and ${brokenLinks.length - 50} more`);
        }
      }

      summary.push('', 'All Links:', '');
      for (const l of result.links.slice(0, 200)) {
        const status = l.broken ? `BROKEN:${l.statusCode}` : l.crawled ? `${l.statusCode || 'OK'}` : l.skipped ? 'SKIP' : 'PENDING';
        summary.push(`  [${status}] (d=${l.depth}) ${l.link}`);
      }
      if (result.links.length > 200) {
        summary.push(`  ... and ${result.links.length - 200} more`);
      }

      return { content: [{ type: 'text', text: summary.join('\n') }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Crawl failed: ${e.message}` }], isError: true };
    }
  }
);

// ─── Tool: crawl-status ────────────────────────────────────────────

server.tool(
  'crawl-status',
  'Check if there is a paused/saved crawl that can be resumed.',
  {},
  async () => {
    const stateManager = new CrawlStateManager();
    const saved = stateManager.load();

    if (!saved) {
      return { content: [{ type: 'text', text: 'No paused crawl found.' }] };
    }

    const info = [
      `Paused crawl found:`,
      `  URL:     ${saved.baseURL}`,
      `  Paused:  ${new Date(saved.savedAt).toLocaleString()}`,
      `  Crawled: ${saved.stats.crawled}`,
      `  Skipped: ${saved.stats.skipped}`,
      `  Broken:  ${saved.stats.broken}`,
      `  Total:   ${saved.stats.total}`,
      `  Pending: ${saved.stats.total - saved.stats.crawled - saved.stats.skipped}`,
      '',
      'Use the "crawl-resume" tool to continue this crawl, or "crawl-discard" to delete it.',
    ];

    return { content: [{ type: 'text', text: info.join('\n') }] };
  }
);

// ─── Tool: crawl-resume ────────────────────────────────────────────

server.tool(
  'crawl-resume',
  'Resume a previously paused crawl from saved state.',
  {
    outputDir: z.string().optional().describe('Override output directory'),
  },
  async (args) => {
    const stateManager = new CrawlStateManager();
    const savedState = stateManager.load();

    if (!savedState) {
      return { content: [{ type: 'text', text: 'No paused crawl found. Start a new crawl with the "crawl" tool.' }], isError: true };
    }

    stateManager.delete();
    const config = savedState.config;
    if (args.outputDir) config.outputDir = path.resolve(args.outputDir);

    const engine = new CrawlEngine();

    try {
      const result = await engine.run(config, { resumeState: savedState });

      const summary = [
        `Resumed crawl ${result.aborted ? 'stopped' : 'complete'}: ${result.baseURL}`,
        '',
        `Stats:`,
        `  Crawled: ${result.stats.crawled}`,
        `  Skipped: ${result.stats.skipped}`,
        `  Broken:  ${result.stats.broken}`,
        `  Total:   ${result.stats.total}`,
        `  Elapsed: ${Math.round(result.stats.elapsed / 1000)}s`,
        '',
        `Output: ${result.outputDir}`,
      ];

      const brokenLinks = result.links.filter(l => l.broken);
      if (brokenLinks.length > 0) {
        summary.push('', `Broken Links (${brokenLinks.length}):`);
        for (const l of brokenLinks.slice(0, 50)) {
          summary.push(`  [${l.statusCode || 'ERR'}] ${l.link}`);
        }
      }

      return { content: [{ type: 'text', text: summary.join('\n') }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Resume failed: ${e.message}` }], isError: true };
    }
  }
);

// ─── Tool: crawl-discard ───────────────────────────────────────────

server.tool(
  'crawl-discard',
  'Discard a previously paused/saved crawl state.',
  {},
  async () => {
    const stateManager = new CrawlStateManager();
    if (!stateManager.exists()) {
      return { content: [{ type: 'text', text: 'No paused crawl to discard.' }] };
    }
    stateManager.delete();
    return { content: [{ type: 'text', text: 'Saved crawl state discarded.' }] };
  }
);

// ─── Tool: config-show ─────────────────────────────────────────────

server.tool(
  'config-show',
  'Show the current Cortex crawler configuration.',
  {},
  async () => {
    const initHandle = new InitiationHandler();
    const config = initHandle.getConfig();
    const formats = config.outputFormats ?? { pdf: true };
    const activeFormats = Object.entries(formats).filter(([, v]) => v).map(([k]) => k).join(', ') || 'none';

    const info = [
      `Cortex Configuration (~/cortex/config.json):`,
      '',
      `  Max Depth:        ${config.maxDepth ?? 2}`,
      `  Concurrency:      ${config.concurrency ?? 3}`,
      `  Max Pages:        ${config.maxPages ?? 100}`,
      `  Crawl Interval:   ${config.crawlInterval ?? 1000}ms`,
      `  Page Timeout:     ${config.maxTimeout ?? 30000}ms`,
      `  Same Domain:      ${(config.boundToBaseUrl ?? true) ? 'yes' : 'no'}`,
      `  Headless:         ${(config.headless ?? true) ? 'yes' : 'no'}`,
      `  Output Formats:   ${activeFormats}`,
      `  Exclude Patterns: ${(config.excludePatterns || []).join(', ') || 'none'}`,
    ];

    return { content: [{ type: 'text', text: info.join('\n') }] };
  }
);

// ─── Tool: config-update ───────────────────────────────────────────

server.tool(
  'config-update',
  'Update the default Cortex crawler configuration. Only provided fields are updated.',
  {
    maxDepth: z.number().optional().describe('Max crawl depth'),
    concurrency: z.number().optional().describe('Number of concurrent pages'),
    maxPages: z.number().optional().describe('Maximum pages to crawl'),
    crawlInterval: z.number().optional().describe('Delay between page crawls in ms'),
    maxTimeout: z.number().optional().describe('Page load timeout in ms'),
    boundToBaseUrl: z.boolean().optional().describe('Restrict to starting domain'),
    headless: z.boolean().optional().describe('Run browser invisibly'),
    excludePatterns: z.array(z.string()).optional().describe('URL patterns to exclude'),
    outputFormats: z.object({
      pdf: z.boolean().optional(),
      screenshot: z.boolean().optional(),
      html: z.boolean().optional(),
      markdown: z.boolean().optional(),
    }).optional().describe('Output formats to generate'),
  },
  async (args) => {
    const initHandle = new InitiationHandler();
    const config = initHandle.getConfig();

    if (args.maxDepth !== undefined) config.maxDepth = args.maxDepth;
    if (args.concurrency !== undefined) config.concurrency = args.concurrency;
    if (args.maxPages !== undefined) config.maxPages = args.maxPages;
    if (args.crawlInterval !== undefined) config.crawlInterval = args.crawlInterval;
    if (args.maxTimeout !== undefined) config.maxTimeout = args.maxTimeout;
    if (args.boundToBaseUrl !== undefined) config.boundToBaseUrl = args.boundToBaseUrl;
    if (args.headless !== undefined) config.headless = args.headless;
    if (args.excludePatterns !== undefined) config.excludePatterns = args.excludePatterns;
    if (args.outputFormats) {
      config.outputFormats = {
        ...(config.outputFormats ?? { pdf: true, screenshot: false, html: false, markdown: false }),
        ...args.outputFormats,
      };
    }

    initHandle.updateConfigFile(config);
    return { content: [{ type: 'text', text: 'Configuration updated successfully.' }] };
  }
);

// ─── Resource: config ──────────────────────────────────────────────

server.resource(
  'config',
  'cortex://config',
  { description: 'Current Cortex crawler configuration', mimeType: 'application/json' },
  async () => {
    const initHandle = new InitiationHandler();
    const config = initHandle.getConfig();
    return { contents: [{ uri: 'cortex://config', text: JSON.stringify(config, null, 2), mimeType: 'application/json' }] };
  }
);

// ─── Resource: saved crawl state ───────────────────────────────────

server.resource(
  'crawl-state',
  'cortex://crawl-state',
  { description: 'Saved/paused crawl state (if any)', mimeType: 'application/json' },
  async () => {
    const stateManager = new CrawlStateManager();
    const state = stateManager.load();
    const text = state ? JSON.stringify(state, null, 2) : '{"status": "no saved crawl"}';
    return { contents: [{ uri: 'cortex://crawl-state', text, mimeType: 'application/json' }] };
  }
);

// ─── Start Server ──────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  process.stderr.write(`MCP server error: ${e.message}\n`);
  process.exit(1);
});
