const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const InitiationHandler = require('../src/InitiationHandler');
const os = require('os');

puppeteer.use(StealthPlugin());

let activeBrowser = null;
let crawlAborted = false;

ipcMain.on('stop-crawl', async () => {
  crawlAborted = true;
  if (activeBrowser) {
    try {
      await activeBrowser.close();
    } catch (_) {
      // browser may already be closed
    }
    activeBrowser = null;
  }
});

ipcMain.on('crawl', async (event, arg) => {
  const initHandle = new InitiationHandler();
  const config = initHandle.getConfig();

  const maxDepth = config.maxDepth ?? 1;
  const headless = config.headless ?? true;
  const maxTimeout = config.maxTimeout ?? 30000;
  const boundToBaseUrl = config.boundToBaseUrl ?? true;
  const crawlInterval = config.crawlInterval ?? 1200;
  const concurrency = config.concurrency ?? 3;
  const excludePatterns = config.excludePatterns || [];
  const maxPages = config.maxPages ?? 100;

  crawlAborted = false;

  console.log('Crawl started:', arg);

  try {
    const parsedBaseURL = new URL(arg);
    const baseURL = parsedBaseURL.origin + parsedBaseURL.pathname;
    const baseHostName = parsedBaseURL.hostname;
    const outputDir = path.resolve(os.homedir(), 'cortex', 'output', baseHostName);

    activeBrowser = await puppeteer.launch({
      headless: headless ? 'new' : false,
    });

    const toCrawlLinks = [{
      depth: 0,
      link: baseURL,
      crawled: false,
      skipped: false,
    }];

    const visitedSet = new Set([baseURL]);
    const startTime = Date.now();

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

    async function crawlPage(url, currentDepth) {
      if (crawlAborted) return [];

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

        await page.goto(url, {
          timeout: maxTimeout,
          waitUntil: 'domcontentloaded',
        });

        await Promise.race([
          page.waitForSelector('body', { timeout: 5000 }),
          delay(5000),
        ]);

        // Save page as PDF
        fs.mkdirSync(outputDir, { recursive: true });
        const pdfName = `page_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.pdf`;
        await page.pdf({
          path: path.join(outputDir, pdfName),
          format: 'A4',
        });

        if (currentDepth >= maxDepth) {
          await page.close();
          return [];
        }

        // Extract links
        const rawLinks = await page.$$eval('a', as => as.map(a => a.href).filter(Boolean));

        const newLinks = [];
        for (const link of rawLinks) {
          try {
            const parsed = new URL(link);
            // Skip non-http(s) links, anchors, mailto, tel, javascript, etc.
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
        return newLinks;
      } catch (e) {
        if (page) await page.close().catch(() => {});
        throw e;
      }
    }

    function emitProgress(currentLink) {
      const crawled = toCrawlLinks.filter(l => l.crawled).length;
      const skipped = toCrawlLinks.filter(l => l.skipped).length;

      event.reply('crawl-progress', {
        currentPath: currentLink,
        links: toCrawlLinks,
        stats: {
          total: toCrawlLinks.length,
          crawled,
          skipped,
          pending: toCrawlLinks.length - crawled - skipped,
          elapsed: Date.now() - startTime,
        },
      });
    }

    // BFS crawl with concurrency
    let crawlIndex = 0;
    let crawledCount = 0;

    while (crawlIndex < toCrawlLinks.length && !crawlAborted) {
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
          const newLinks = results[i].value;
          toCrawlLinks.push(...newLinks);
          toCrawlLinks[idx].crawled = true;
          crawledCount++;
        } else {
          toCrawlLinks[idx].skipped = true;
          toCrawlLinks[idx].error = results[i].reason?.message || 'Unknown error';
          console.error(`Failed: ${toCrawlLinks[idx].link} - ${toCrawlLinks[idx].error}`);
        }
      }

      emitProgress(toCrawlLinks[batchIndices[batchIndices.length - 1]]?.link);
    }

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
        elapsed: Date.now() - startTime,
      },
    });

    if (activeBrowser) {
      await activeBrowser.close().catch(() => {});
      activeBrowser = null;
    }
  } catch (e) {
    console.error('Crawl failed:', e);
    event.sender.send('crawl-failed', e.message);
    if (activeBrowser) {
      await activeBrowser.close().catch(() => {});
      activeBrowser = null;
    }
  }

  crawlAborted = false;
});
