import { contextBridge, ipcRenderer, shell, webUtils } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel: string, payload?: unknown) => ipcRenderer.send(channel, payload),
  on: (channel: string, listener: (payload: unknown) => void) =>
    ipcRenderer.on(channel, (_event, payload) => listener(payload)),
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  openPath: (path: string) => shell.openPath(path)
})
