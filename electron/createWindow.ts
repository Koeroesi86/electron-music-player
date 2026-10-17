import { BrowserWindow } from 'electron'
import { resolve } from 'path'
import windowStateKeeper from 'electron-window-state'

// const { TouchBarLabel, TouchBarSpacer } = TouchBar

// const artist = new TouchBarLabel({ textColor: '#5c43e8' })
// const track = new TouchBarLabel({ textColor: '#555555' })
// const time = new TouchBarLabel({ textColor: '#5c43e8' })

// const touchBar = new TouchBar([
//   artist,
//   new TouchBarSpacer({ size: 'small' }),
//   track,
//   new TouchBarSpacer({ size: 'small' }),
//   time
// ])

const createWindow = () => {
  const mainWindowState = windowStateKeeper({
    defaultWidth: 1200,
    defaultHeight: 800,
    maximize: false
  })
  const mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    frame: false,
    transparent: true,
    darkTheme: true,
    show: false,
    webPreferences: {
      // webSecurity: false,
      backgroundThrottling: false,
      preload: resolve(__dirname, './preload.js'),
      webviewTag: true
    }
  })
  mainWindowState.manage(mainWindow)
  // mainWindow.setTouchBar(touchBar)
  mainWindow.setFullScreenable(false)

  // app.updateTouchBar = metadata => {
  //   artist.label = metadata.artist
  //   track.label = metadata.track
  // }
  //
  // app.updateTouchBarTime = duration => {
  //   time.label = duration
  // }

  return mainWindow
}

export default createWindow
