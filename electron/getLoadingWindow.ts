import { BrowserWindow } from 'electron'

function getLoadingWindow () {
  const loadingWindow = new BrowserWindow({
    // x: 0,
    // y: 0,
    width: 400,
    height: 300,
    frame: false,
    center: true,
    resizable: false,
    transparent: true,
    darkTheme: true,
    show: false,
    webPreferences: {
      backgroundThrottling: false,
      webSecurity: false
    }
  })
  // loadingWindow.setSize(400, 300)
  loadingWindow.setResizable(false)
  loadingWindow.setMaximizable(false)
  loadingWindow.setFullScreenable(false)
  // loadingWindow.setClosable(false)
  loadingWindow.setVibrancy('under-window')

  return loadingWindow
}

export default getLoadingWindow
