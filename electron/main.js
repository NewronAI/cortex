const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow;

require('./ipcHandlers/main');

const InitHandler = require('./src/InitiationHandler');

function createWindow() {
  mainWindow = new BrowserWindow({
    icon: path.join(__dirname, '..', 'images', 'icon.png'),
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 550,
    frame: false,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'build', 'index.html')).then(() => {
    const init = new InitHandler();
    console.log('Config loaded:', init.config);
  }).catch((err) => {
    console.error('Failed to load index.html:', err);
  });
}

// Window controls
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window-close', () => mainWindow?.close());

// Output path
ipcMain.handle('get-output-path', () => {
  return path.resolve(require('os').homedir(), 'cortex', 'output');
});

// Open folder
ipcMain.on('open-folder', (_event, folderPath) => {
  shell.showItemInFolder(folderPath);
});

// Config management
ipcMain.on('get-config', (event) => {
  const init = new InitHandler();
  event.reply('config-data', init.getConfig());
});

ipcMain.on('save-config', (event, newConfig) => {
  const init = new InitHandler();
  const current = init.getConfig();
  const merged = { ...current, ...newConfig };
  init.updateConfigFile(merged);
  event.reply('config-data', merged);
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
