const {ipcMain} = require('electron');
const config = require("./../../config");

const puppeteer = require('puppeteer');
const url = require("url");

const maxDepth = config.maxDepth;
ipcMain.on('crawl', async (event, arg) => {

    console.log(arg);

    const browser = await puppeteer.launch();

    const page = await browser.newPage();
    let depth = 0;

    const toCrawlLinks = [{
        depth: depth,
        link: arg,
        crawled: false
    }];

    function isAlreadyFound(link) {
        return !!toCrawlLinks.find(toCrawlLink => toCrawlLink.link === link);
    }
    function isCrawled(link) {
        return !!toCrawlLinks.find(toCrawlLink => toCrawlLink.link === link && toCrawlLink.crawled);
    }

    function crawlPage(url,depth) {
        return new Promise(async (resolve, reject) => {
            try {
                await page.goto(url);
                const links = await page.$$eval('a', as => as.map(a => a.href));

                const newLinks = links;
                // const newLinks = links.filter(link => {
                //     const parsedUrl = new URL(link);
                //     return parsedUrl.hostname === url.hostname;
                // });

                let newLinksToCrawl = [];

                for(let i = 0; i < newLinks.length; i++) {
                    const link = newLinks[i];
                    if(!isAlreadyFound(link)) {
                        newLinksToCrawl.push({
                            depth: depth + 1,
                            link: link,
                            crawled: false
                        });
                    }
                }

                resolve(newLinksToCrawl);

            } catch (e) {
                reject(e);
            }
        });
    }

    let crawlIndex = 0;
    while (toCrawlLinks.length > 0 ) {
        const toCrawlLink = toCrawlLinks[crawlIndex];
        if(toCrawlLink.depth > maxDepth) {
            toCrawlLinks[crawlIndex].skipped = true;
        }
        else if(!isCrawled(toCrawlLink.link )) {
            const newLinks = await crawlPage(toCrawlLink.link, depth);
            toCrawlLinks.push(...newLinks);
            toCrawlLinks[crawlIndex].crawled = true;
        }
        event.reply('crawl', {
            currentPath: toCrawlLink.link,
            links: toCrawlLinks
        });
        crawlIndex++;
    }

});