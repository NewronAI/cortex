const {ipcMain} = require('electron');

const puppeteer = require('puppeteer');
const url = require("url");

ipcMain.on('crawl', async (event, arg) => {

    console.log(arg);

    const browser = await puppeteer.launch();

    const page = await browser.newPage();

    await page.goto(arg);

    let depth = 0;

    const links = await page.$$eval('a', as => as.map(a => a.href));

    console.log(links);

    event.reply('crawl', {
        currentPath: arg,
        links: links.map(link => {
            return {
                depth: depth + 1,
                link: link,
                crawled: false
            }
        })
    });

});