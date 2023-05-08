const {ipcMain} = require('electron');

ipcMain.on('crawl', (event, arg) => {
    console.log(arg);
    event.reply('crawl', 'pong');
});