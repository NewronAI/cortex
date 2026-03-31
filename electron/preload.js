const { contextBridge, ipcRenderer } = require('electron');

const SEND_CHANNELS = [
  'crawl',
  'stop-crawl',
  'window-minimize',
  'window-maximize',
  'window-close',
  'get-config',
  'save-config',
  'get-output-path',
  'open-folder',
];

const RECEIVE_CHANNELS = [
  'crawl-progress',
  'crawl-finished',
  'crawl-failed',
  'config-data',
  'output-path',
];

contextBridge.exposeInMainWorld('electronAPI', {
  send(channel, data) {
    if (SEND_CHANNELS.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },

  invoke(channel, data) {
    if (SEND_CHANNELS.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    }
  },

  on(channel, callback) {
    if (RECEIVE_CHANNELS.includes(channel)) {
      const listener = (_event, ...args) => callback(...args);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    }
  },

  once(channel, callback) {
    if (RECEIVE_CHANNELS.includes(channel)) {
      ipcRenderer.once(channel, (_event, ...args) => callback(...args));
    }
  },

  removeAllListeners(channel) {
    if (RECEIVE_CHANNELS.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },
});
