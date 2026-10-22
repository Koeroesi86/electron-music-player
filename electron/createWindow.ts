import { BrowserWindow } from 'electron';
import { resolve } from 'path';
import windowStateKeeper from 'electron-window-state';
import lockNavigation from './lockNavigation';

const createWindow = () => {
  const mainWindowState = windowStateKeeper({
    defaultWidth: 1200,
    defaultHeight: 800,
    maximize: false,
  });
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
      backgroundThrottling: false,
      preload: resolve(__dirname, './preload.js'),
      webviewTag: true,
    },
  });
  mainWindowState.manage(mainWindow);
  lockNavigation(mainWindow.webContents);
  mainWindow.setFullScreenable(false);

  return mainWindow;
};

export default createWindow;
