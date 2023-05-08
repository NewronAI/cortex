const {ipcMain} = require('electron');
const fs = require("fs");
const path = require("path");
const puppeteer = require('puppeteer');

const InitiationHandler = require("./../src/InitiationHandler");
const os = require("os");
const initHandle = new InitiationHandler();

const maxDepth = initHandle.getConfig().maxDepth;
ipcMain.on('crawl', async (event, arg) => {

    console.log("Initial URL Received: ",arg);

    try {
        const parsedBaseURL = new URL(arg);
        const baseURL = parsedBaseURL.origin + parsedBaseURL.pathname;

        const browser = await puppeteer.launch();

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

        function crawlPage(url, currentDepth) {
            return new Promise(async (resolve, reject) => {
                let page;
                try {
                    page = await browser.newPage();

                    await page.goto(url, {timeout: 10000});

                    const baseHostName = new URL(baseURL).hostname;

                    await page.waitForSelector('a', {timeout: 10000});


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

                        if (!isAlreadyFound(cleanLink)) {
                            newLinksToCrawl.push({
                                depth: currentDepth + 1,
                                link: cleanLink,
                                crawled: false
                            });
                        }
                    }

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