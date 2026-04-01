const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const InitiationHandler = require('../src/InitiationHandler');
const OutputGenerator = require('../src/OutputGenerator');
const CrawlStateManager = require('../src/CrawlStateManager');
const os = require('os');

puppeteer.use(StealthPlugin());

let activeBrowser = null;
let crawlAborted = false;
let crawlPaused = false;
let pauseResolve = null;
let activeEvent = null;
let activeCrawlState = null;

const stateManager = new CrawlStateManager();

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function downloadPdf(url, destPath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const stream = fs.createWriteStream(destPath);
      res.pipe(stream);
      stream.on('finish', () => { stream.close(); resolve(); });
      stream.on('error', reject);
    }).on('error', reject);
  });
}

async function runCrawl(event, { startUrl, resumeState }) {
  const initHandle = new InitiationHandler();
  const config = resumeState?.config ?? initHandle.getConfig();

  const maxDepth = config.maxDepth ?? 1;
  const headless = config.headless ?? true;
  const maxTimeout = config.maxTimeout ?? 30000;
  const boundToBaseUrl = config.boundToBaseUrl ?? true;
  const crawlInterval = config.crawlInterval ?? 1200;
  const concurrency = config.concurrency ?? 3;
  const excludePatterns = config.excludePatterns || [];
  const maxPages = config.maxPages ?? 100;
  const outputFormats = config.outputFormats ?? { pdf: true, screenshot: false, html: false, markdown: false };

  crawlAborted = false;
  crawlPaused = false;
  pauseResolve = null;
  activeEvent = event;

  const isResume = !!resumeState;
  const parsedBaseURL = new URL(resumeState?.startUrl ?? startUrl);
  const baseURL = resumeState?.baseURL ?? (parsedBaseURL.origin + parsedBaseURL.pathname);
  const baseHostName = resumeState?.baseHostName ?? parsedBaseURL.hostname;
  const outputDir = path.resolve(os.homedir(), 'cortex', 'output', baseHostName);
  const outputGen = new OutputGenerator(outputDir, outputFormats);

  console.log(isResume ? 'Crawl resumed:' : 'Crawl started:', baseURL);

  try {
    activeBrowser = await puppeteer.launch({
      headless: headless ? 'new' : false,
    });

    const toCrawlLinks = resumeState?.queue ?? [{
      depth: 0,
      link: baseURL,
      crawled: false,
      skipped: false,
    }];

    const visitedSet = resumeState
      ? new Set(resumeState.visited)
      : new Set([baseURL]);

    const elapsedOffset = resumeState?.stats?.elapsed ?? 0;
    const startTime = Date.now() - elapsedOffset;

    function matchesExcludePattern(url) {
      return excludePatterns.some(pattern => {
        try {
          return new RegExp(pattern).test(url);
        } catch {
          return url.includes(pattern);
        }
      });
    }

    function isBound(link) {
      if (!boundToBaseUrl) return true;
      try {
        return new URL(link).origin === parsedBaseURL.origin;
      } catch {
        return false;
      }
    }

    async function crawlPage(url, currentDepth) {
      if (crawlAborted) return { newLinks: [], statusCode: null };

      let page;
      try {
        page = await activeBrowser.newPage();
        await page.setRequestInterception(true);

        page.on('request', request => {
          if (crawlAborted) {
            request.abort().catch(() => {});
            return;
          }
          if (request.url().endsWith('.pdf')) {
            fs.mkdirSync(outputDir, { recursive: true });
            const pdfName = `pdf_${Date.now()}.pdf`;
            downloadPdf(request.url(), path.join(outputDir, pdfName)).catch(() => {});
            request.abort().catch(() => {});
          } else {
            request.continue().catch(() => {});
          }
        });

        const response = await page.goto(url, {
          timeout: maxTimeout,
          waitUntil: 'domcontentloaded',
        });
        const statusCode = response ? response.status() : null;

        await Promise.race([
          page.waitForSelector('body', { timeout: 5000 }),
          delay(5000),
        ]);

        // Generate output files (PDF, screenshot, HTML, markdown based on config)
        await outputGen.generate(page);

        if (currentDepth >= maxDepth) {
          await page.close();
          return { newLinks: [], statusCode };
        }

        // Extract links
        const rawLinks = await page.$$eval('a', as => as.map(a => a.href).filter(Boolean));

        const newLinks = [];
        for (const link of rawLinks) {
          try {
            const parsed = new URL(link);
            if (!parsed.protocol.startsWith('http')) continue;
            const cleanLink = parsed.origin + parsed.pathname;

            if (!visitedSet.has(cleanLink) && isBound(cleanLink) && !matchesExcludePattern(cleanLink)) {
              visitedSet.add(cleanLink);
              newLinks.push({
                depth: currentDepth + 1,
                link: cleanLink,
                crawled: false,
                skipped: false,
              });
            }
          } catch {
            // Invalid URL, skip
          }
        }

        await delay(crawlInterval);
        await page.close();
        return { newLinks, statusCode };
      } catch (e) {
        if (page) await page.close().catch(() => {});
        throw e;
      }
    }

    function emitProgress(currentLink) {
      const crawled = toCrawlLinks.filter(l => l.crawled).length;
      const skipped = toCrawlLinks.filter(l => l.skipped).length;
      const broken = toCrawlLinks.filter(l => l.broken).length;

      event.reply('crawl-progress', {
        currentPath: currentLink,
        links: toCrawlLinks,
        stats: {
          total: toCrawlLinks.length,
          crawled,
          skipped,
          broken,
          pending: toCrawlLinks.length - crawled - skipped,
          elapsed: Date.now() - startTime,
        },
      });
    }

    // Store reference so pause handler can capture state
    activeCrawlState = {
      startUrl: resumeState?.startUrl ?? startUrl,
      baseURL,
      baseHostName,
      config,
      toCrawlLinks,
      visitedSet,
      startTime,
      get crawlIndex() { return crawlIndex; },
      get crawledCount() { return crawledCount; },
    };

    // BFS crawl with concurrency
    let crawlIndex = resumeState?.crawlIndex ?? 0;
    let crawledCount = resumeState?.crawledCount ?? 0;

    while (crawlIndex < toCrawlLinks.length && !crawlAborted) {
      // Pause gate: block between batches if paused
      if (crawlPaused) {
        await new Promise(resolve => { pauseResolve = resolve; });
        if (crawlAborted) break;
      }

      // Collect a batch of uncrawled/unskipped links
      const batch = [];
      const batchIndices = [];

      while (batch.length < concurrency && crawlIndex < toCrawlLinks.length) {
        const item = toCrawlLinks[crawlIndex];

        if (item.depth > maxDepth || crawledCount >= maxPages) {
          toCrawlLinks[crawlIndex].skipped = true;
          crawlIndex++;
          continue;
        }

        batch.push(crawlPage(item.link, item.depth));
        batchIndices.push(crawlIndex);
        crawlIndex++;
      }

      if (batch.length === 0) break;

      const results = await Promise.allSettled(batch);

      for (let i = 0; i < results.length; i++) {
        const idx = batchIndices[i];
        if (results[i].status === 'fulfilled') {
          const { newLinks, statusCode } = results[i].value;
          toCrawlLinks.push(...newLinks);
          toCrawlLinks[idx].crawled = true;
          toCrawlLinks[idx].statusCode = statusCode;
          toCrawlLinks[idx].broken = statusCode >= 400;
          crawledCount++;
        } else {
          toCrawlLinks[idx].skipped = true;
          toCrawlLinks[idx].statusCode = null;
          toCrawlLinks[idx].broken = false;
          toCrawlLinks[idx].error = results[i].reason?.message || 'Unknown error';
          console.error(`Failed: ${toCrawlLinks[idx].link} - ${toCrawlLinks[idx].error}`);
        }
      }

      emitProgress(toCrawlLinks[batchIndices[batchIndices.length - 1]]?.link);
    }

    activeCrawlState = null;
    const aborted = crawlAborted;
    console.log(aborted ? 'Crawl aborted' : 'Crawl finished');

    event.sender.send('crawl-finished', {
      baseURL,
      aborted,
      outputDir,
      stats: {
        total: toCrawlLinks.length,
        crawled: toCrawlLinks.filter(l => l.crawled).length,
        skipped: toCrawlLinks.filter(l => l.skipped).length,
        broken: toCrawlLinks.filter(l => l.broken).length,
        elapsed: Date.now() - startTime,
      },
    });

    if (activeBrowser) {
      await activeBrowser.close().catch(() => {});
      activeBrowser = null;
    }
  } catch (e) {
    activeCrawlState = null;
    console.error('Crawl failed:', e);
    event.sender.send('crawl-failed', e.message);
    if (activeBrowser) {
      await activeBrowser.close().catch(() => {});
      activeBrowser = null;
    }
  }

  activeEvent = null;
  crawlAborted = false;
  crawlPaused = false;
  pauseResolve = null;
}

// --- IPC Handlers ---

ipcMain.on('stop-crawl', async () => {
  crawlAborted = true;
  if (crawlPaused && pauseResolve) {
    crawlPaused = false;
    pauseResolve();
    pauseResolve = null;
  }
  stateManager.delete();
  if (activeBrowser) {
    try {
      await activeBrowser.close();
    } catch (_) {
      // browser may already be closed
    }
    activeBrowser = null;
  }
});

ipcMain.on('pause-crawl', () => {
  if (!crawlPaused && activeCrawlState) {
    crawlPaused = true;

    const s = activeCrawlState;
    stateManager.save({
      version: 1,
      savedAt: new Date().toISOString(),
      startUrl: s.startUrl,
      baseURL: s.baseURL,
      baseHostName: s.baseHostName,
      config: s.config,
      queue: s.toCrawlLinks,
      visited: Array.from(s.visitedSet),
      crawledCount: s.crawledCount,
      crawlIndex: s.crawlIndex,
      stats: {
        total: s.toCrawlLinks.length,
        crawled: s.toCrawlLinks.filter(l => l.crawled).length,
        skipped: s.toCrawlLinks.filter(l => l.skipped).length,
        broken: s.toCrawlLinks.filter(l => l.broken).length,
        elapsed: Date.now() - s.startTime,
      },
    });

    if (activeEvent) {
      activeEvent.reply('crawl-paused');
    }
  }
});

ipcMain.on('resume-crawl', () => {
  if (crawlPaused && pauseResolve) {
    crawlPaused = false;
    stateManager.delete();
    pauseResolve();
    pauseResolve = null;
    if (activeEvent) {
      activeEvent.reply('crawl-resumed');
    }
  }
});

ipcMain.handle('check-saved-crawl', () => {
  return stateManager.load();
});

ipcMain.on('resume-saved-crawl', async (event) => {
  const savedState = stateManager.load();
  if (!savedState) {
    event.reply('crawl-failed', 'No saved crawl state found');
    return;
  }
  stateManager.delete();
  await runCrawl(event, { resumeState: savedState });
});

ipcMain.on('discard-saved-crawl', () => {
  stateManager.delete();
});

ipcMain.on('crawl', async (event, arg) => {
  stateManager.delete();
  await runCrawl(event, { startUrl: arg });
});
