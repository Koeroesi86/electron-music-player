const { contextBridge, ipcRenderer, shell, webUtils } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, payload) => ipcRenderer.send(channel, payload),
  on: (channel, listener) => ipcRenderer.on(channel, (event, payload) => listener(payload)),
  getPathForFile: file => webUtils.getPathForFile(file),
  openPath: path => shell.openPath(path)
})
