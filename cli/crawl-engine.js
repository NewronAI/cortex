const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const OutputGenerator = require('../electron/src/OutputGenerator');
const CrawlStateManager = require('../electron/src/CrawlStateManager');
const os = require('os');
const { EventEmitter } = require('events');

puppeteer.use(StealthPlugin());

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

class CrawlEngine extends EventEmitter {
  constructor() {
    super();
    this.activeBrowser = null;
    this.crawlAborted = false;
    this.crawlPaused = false;
    this.pauseResolve = null;
    this.activeCrawlState = null;
    this.stateManager = new CrawlStateManager();
  }

  stop() {
    this.crawlAborted = true;
    if (this.crawlPaused && this.pauseResolve) {
      this.crawlPaused = false;
      this.pauseResolve();
      this.pauseResolve = null;
    }
    this.stateManager.delete();
    if (this.activeBrowser) {
      this.activeBrowser.close().catch(() => {});
      this.activeBrowser = null;
    }
  }

  pause() {
    if (!this.crawlPaused && this.activeCrawlState) {
      this.crawlPaused = true;

      const s = this.activeCrawlState;
      this.stateManager.save({
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

      this.emit('paused');
    }
  }

  resume() {
    if (this.crawlPaused && this.pauseResolve) {
      this.crawlPaused = false;
      this.stateManager.delete();
      this.pauseResolve();
      this.pauseResolve = null;
      this.emit('resumed');
    }
  }

  checkSavedCrawl() {
    return this.stateManager.load();
  }

  discardSavedCrawl() {
    this.stateManager.delete();
  }

  async run(config, { startUrl, resumeState } = {}) {
    const maxDepth = config.maxDepth ?? 2;
    const headless = config.headless ?? true;
    const maxTimeout = config.maxTimeout ?? 30000;
    const boundToBaseUrl = config.boundToBaseUrl ?? true;
    const crawlInterval = config.crawlInterval ?? 1000;
    const concurrency = config.concurrency ?? 3;
    const excludePatterns = config.excludePatterns || [];
    const maxPages = config.maxPages ?? 100;
    const outputFormats = config.outputFormats ?? { pdf: true, screenshot: false, html: false, markdown: false };

    this.crawlAborted = false;
    this.crawlPaused = false;
    this.pauseResolve = null;

    const isResume = !!resumeState;
    const parsedBaseURL = new URL(resumeState?.startUrl ?? startUrl);
    const baseURL = resumeState?.baseURL ?? (parsedBaseURL.origin + parsedBaseURL.pathname);
    const baseHostName = resumeState?.baseHostName ?? parsedBaseURL.hostname;
    const outputDir = config.outputDir ?? path.resolve(os.homedir(), 'cortex', 'output', baseHostName);
    const outputGen = new OutputGenerator(outputDir, outputFormats);

    this.emit('start', { baseURL, isResume, outputDir });

    try {
      this.activeBrowser = await puppeteer.launch({
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

      const self = this;

      async function crawlPage(url, currentDepth) {
        if (self.crawlAborted) return { newLinks: [], statusCode: null };

        let page;
        try {
          page = await self.activeBrowser.newPage();
          await page.setRequestInterception(true);

          page.on('request', request => {
            if (self.crawlAborted) {
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

          await outputGen.generate(page);

          if (currentDepth >= maxDepth) {
            await page.close();
            return { newLinks: [], statusCode };
          }

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
              // Invalid URL
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

      // Store reference for pause handler
      this.activeCrawlState = {
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

      let crawlIndex = resumeState?.crawlIndex ?? 0;
      let crawledCount = resumeState?.crawledCount ?? 0;

      while (crawlIndex < toCrawlLinks.length && !this.crawlAborted) {
        if (this.crawlPaused) {
          await new Promise(resolve => { this.pauseResolve = resolve; });
          if (this.crawlAborted) break;
        }

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
          }
        }

        const crawled = toCrawlLinks.filter(l => l.crawled).length;
        const skipped = toCrawlLinks.filter(l => l.skipped).length;
        const broken = toCrawlLinks.filter(l => l.broken).length;

        this.emit('progress', {
          currentPath: toCrawlLinks[batchIndices[batchIndices.length - 1]]?.link,
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

      this.activeCrawlState = null;
      const aborted = this.crawlAborted;

      const crawledFinal = toCrawlLinks.filter(l => l.crawled).length;
      const skippedFinal = toCrawlLinks.filter(l => l.skipped).length;
      const finalStats = {
        total: toCrawlLinks.length,
        crawled: crawledFinal,
        skipped: skippedFinal,
        broken: toCrawlLinks.filter(l => l.broken).length,
        pending: toCrawlLinks.length - crawledFinal - skippedFinal,
        elapsed: Date.now() - startTime,
      };

      if (this.activeBrowser) {
        await this.activeBrowser.close().catch(() => {});
        this.activeBrowser = null;
      }

      this.emit('finished', { baseURL, aborted, outputDir, stats: finalStats, links: toCrawlLinks });
      return { baseURL, aborted, outputDir, stats: finalStats, links: toCrawlLinks };

    } catch (e) {
      this.activeCrawlState = null;
      if (this.activeBrowser) {
        await this.activeBrowser.close().catch(() => {});
        this.activeBrowser = null;
      }
      this.emit('error', e);
      throw e;
    } finally {
      this.crawlAborted = false;
      this.crawlPaused = false;
      this.pauseResolve = null;
    }
  }
}

module.exports = CrawlEngine;
