const main = require("electron");
const path = require("path");
const app = main.app;

if (require('electron-squirrel-startup')) {
    app.quit();
}

const BrowserWindow = main.BrowserWindow;
let mainWindow;

require("./ipcHandlers/main");

const InitHandler = require("./src/InitiationHandler");
const {format} = require("url");

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        icon: format({
            pathname:  "../build/newron-logo.png",
            protocol: "file:",
            slashes: true
        }),
        width: 800,
        height: 550,
        frame: false,
        resizable: false,
        // kiosk: true,
        // alwaysOnTop: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
    });
    // and load the index.html of the app.
    console.log(__dirname);
    mainWindow.loadFile(format({
        pathname:  "../build/index.html",
        protocol: "file:",
        slashes: true
    })).then(r => {
        console.log(r);
        const init = new InitHandler();
        console.log(init.config);
    });



}


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);
