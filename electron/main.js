const main = require("electron");
const path = require("path");
const app = main.app;
const BrowserWindow = main.BrowserWindow;
let mainWindow;

require("./ipcHandlers/main");

const InitHandler = require("./src/InitiationHandler");

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
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
    mainWindow.loadFile(path.join(__dirname, "../build/index.html"));

    const init = new InitHandler();
    console.log(init.config);

}


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);
