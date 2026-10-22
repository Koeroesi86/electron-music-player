import { ipcMain, nativeImage } from 'electron';
import type { BrowserWindow } from 'electron';
import { resolve } from 'path';
import type { AppWindows } from '../types/global';
import { getMainWindow } from './getMainWindow';
import type { ListenerContext } from './listenerContext';

const isWin = process.platform === 'win32';
const showDelay = 200;

const playbackButton = (main: BrowserWindow, tooltip: string, icon: string, isPlaying: boolean) => ({
  tooltip,
  icon: nativeImage.createFromPath(resolve(__dirname, `../../assets/${icon}`)),
  click: () => main.webContents.send('SET_PLAYING', { isPlaying }),
});

const showMainWindow = (windows: AppWindows) => {
  const main = getMainWindow(windows);
  main.show();
  windows.loading?.close();
  windows.loading = null;

  if (!isWin) {
    main.setVibrancy('under-window');
    return;
  }
  main.setBackgroundMaterial('acrylic');
  main.setThumbarButtons([playbackButton(main, 'Play', 'icons_play.png', true), playbackButton(main, 'Pause', 'icons_pause.png', false)]);
};

const listenForMaximize = (main: BrowserWindow) => {
  // main.isMaximized() is not working
  let isMaximized = false;
  const setMaximized = (maximized: boolean) => {
    isMaximized = maximized;
    main.webContents.send('MAXIMIZED_APP', { maximized });
  };

  main.on('maximize', () => setMaximized(true));
  main.on('unmaximize', () => setMaximized(false));
  ipcMain.on('MAXIMIZE_APP', () => (isMaximized ? main.unmaximize() : main.maximize()));
};

const focusMainWindow = (main: BrowserWindow) => {
  main.setAlwaysOnTop(true);
  main.show();
  main.focus();
  main.setAlwaysOnTop(false);
};

const registerWindowListeners = ({ windows }: ListenerContext) => {
  const main = () => getMainWindow(windows);

  ipcMain.once('APP_LOADED', () => setTimeout(() => showMainWindow(windows), showDelay));
  ipcMain.on('CLOSE_APP', () => main().close());
  ipcMain.on('MINIMIZE_APP', () => main().minimize());
  ipcMain.on('NOTIFICATION_CLICKED', () => focusMainWindow(main()));
  listenForMaximize(main());
};

export default registerWindowListeners;
