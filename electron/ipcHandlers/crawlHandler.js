const {ipcMain} = require('electron');
const fs = require("fs");
const path = require("path");
const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const InitiationHandler = require("./../src/InitiationHandler");
const os = require("os");
const initHandle = new InitiationHandler();
const request_client = require('request-promise-native');


// add stealth plugin and use defaults (all evasion techniques)
puppeteer.use(StealthPlugin())

const maxDepth = initHandle.getConfig().maxDepth;
const headless = initHandle.getConfig().headless;
const maxTimeout = initHandle.getConfig().maxTimeout;
const boundToBaseUrl = initHandle.getConfig().boundToBaseUrl;
const crawlInterval = initHandle.getConfig().crawlInterval;

ipcMain.on('crawl', async (event, arg) => {

    console.log("Initial URL Received: ",arg);

    try {
        const parsedBaseURL = new URL(arg);
        const baseURL = parsedBaseURL.origin + parsedBaseURL.pathname;

        const browser = await puppeteer.launch({
            headless: headless
        });

        let depth = 0;

        const toCrawlLinks = [{
            depth: depth,
            link: baseURL,
            crawled: false
        }];

        function isAlreadyFound(link) {
            return !!toCrawlLinks.find(toCrawlLink => toCrawlLink.link === link);
        }

        function isCrawled(link) {
            return !!toCrawlLinks.find(toCrawlLink => toCrawlLink.link === link && toCrawlLink.crawled);
        }

        function isBoundToBaseUrl(baseURL, link, boundToBaseUrl) {
            if (boundToBaseUrl) {

                const parsedBaseURL = new URL(baseURL);
                const parsedLink = new URL(link);

                return parsedBaseURL.origin === parsedLink.origin;

            }
            return true;
        }

        function crawlPage(url, currentDepth) {
            return new Promise(async (resolve, reject) => {
                let page;
                try {
                    page = await browser.newPage();

                    await page.setRequestInterception(true);

                    page.on('request', request => {
                        if (request.url().endsWith('.pdf')) {
                            request_client({
                                uri: request.url(),
                                encoding: null,
                                headers: {
                                    'Content-type': 'applcation/pdf',
                                },
                            }).then(response => {
                                console.log(response); // PDF Buffer
                                request.abort();
                            });
                        } else {
                            request.continue();
                        }
                    });

                    await page.goto(url, {timeout: maxTimeout || 30000});

                    const baseParsedURL = new URL(baseURL);
                    const baseHostName = baseParsedURL.hostname;

                    let pageLoadSelectors = ['a','p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'div', 'li', 'ul', 'ol', 'table', 'tr', 'td', 'th', 'nav', 'header', 'footer', 'section', 'article', 'aside', 'main', 'iframe', 'video', 'audio', 'canvas', 'svg', 'address', 'blockquote', 'cite', 'code', 'pre', 'em', 'strong', 'i', 'b', 'u', 's', 'small', 'sub', 'sup', 'mark', 'br', 'hr', 'meter', 'progress', 'details', 'summary', 'menuitem', 'menu', 'dialog', 'slot', 'template', 'acronym',  'command', 'content', 'dir', 'element', ]
                    let pageLoadPromises = pageLoadSelectors.map(selector => page.waitForSelector(selector, {timeout: 10000}));
                    // Also added this for pdf download
                    pageLoadPromises.push(page.waitForNetworkIdle());

                    await Promise.any(pageLoadPromises);

                    fs.existsSync(path.resolve(os.homedir() + `/cortex/output/${baseHostName}`)) || fs.mkdirSync(path.resolve(os.homedir() + `/cortex/output/${baseHostName}`), {recursive: true});

                    const links = await page.$$eval('a', as => as.map(a => a.href));
                    const pdfUniqueName = new Date().getTime();
                    await page.pdf({ 
                        path: path.resolve(os.homedir() + `/cortex/output/${baseHostName}/page_${pdfUniqueName}.pdf`),
                        format: 'A4'
                    });

                    console.log(url, currentDepth);

                    if (currentDepth >= maxDepth) {
                        resolve([]);
                        return;
                    }

                    let newLinksToCrawl = [];

                    for (let i = 0; i < links.length; i++) {
                        const link = links[i];

                        let cleanLink = link;

                        if (!link) {
                            continue;
                        }

                        try {
                            let parseURL = new URL(link);
                            cleanLink = parseURL.origin + parseURL.pathname;
                        } catch (e) {
                            console.log(e);
                            continue;
                        }

                        if (!isAlreadyFound(cleanLink) && isBoundToBaseUrl(baseURL, cleanLink, boundToBaseUrl)) {
                            newLinksToCrawl.push({
                                depth: currentDepth + 1,
                                link: cleanLink,
                                crawled: false
                            });
                        }
                    }

                    await page.waitForTimeout(crawlInterval);
                    await page.close();
                    resolve(newLinksToCrawl);

                } catch (e) {
                    try {
                        await page.close();
                    } catch (e) {
                        console.log(e);
                    }
                    reject(e);
                }
            });
        }

        let crawlIndex = 0;
        while (toCrawlLinks.length > 0 && crawlIndex < toCrawlLinks.length) {

            const toCrawlLink = toCrawlLinks[crawlIndex];

            if (toCrawlLink.depth > maxDepth) {
                toCrawlLinks[crawlIndex].skipped = true;
            } else if (!isCrawled(toCrawlLink.link)) {
                try {
                    const newLinks = await crawlPage(toCrawlLink.link, toCrawlLink.depth);
                    toCrawlLinks.push(...newLinks);
                    toCrawlLinks[crawlIndex].crawled = true;
                } catch (e) {
                    console.log(e);
                    toCrawlLinks[crawlIndex].skipped = true;
                }
            }

            event.reply('crawl', {
                currentPath: toCrawlLink.link,
                links: toCrawlLinks
            });

            crawlIndex++;
        }

        console.log("crawl finished");
        event.sender.send('crawl-finished', baseURL);

        await browser.close();
    }
    catch (e) {
        event.sender.send("crawl-failed", e.message);
    }

});