import { app } from 'electron';
import type { BrowserWindow } from 'electron';
import { join, resolve } from 'path';
import fs from 'fs';
import minimist from 'minimist';
import ws from 'windows-shortcuts-appid';
import type { AppWindows } from './types/global';
import getAppDataPath from './electron/appDataPath';
import createWindow from './electron/createWindow';
import getLoadingWindow from './electron/getLoadingWindow';
import createDatabase from './electron/createDatabase';
import setupListeners from './electron/setupListeners';
import setupServer from './electron/setupServer';
import { createRadioBrowser } from './electron/radioBrowser';
import { getAppUserModelId } from './electron/appUserModelId';
import { registerDevDesktopEntry, removeDevDesktopEntry } from './electron/devDesktopEntry';
import closeDatabase from './electron/closeDatabase';
import { autoUpdater } from 'electron-updater';
import { canUpdate, createMockUpdateSource, runUpdate } from './electron/updater';
import type { UpdateSource } from './electron/updater';

// compiled to out/index.js, the project root is one level up
const rootPath = resolve(__dirname, '..');
const packageInfo: { name: string; description: string } = JSON.parse(fs.readFileSync(resolve(rootPath, 'package.json'), 'utf8'));

process.env.ELECTRON_ENABLE_LOGGING = '1';

const isWin = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const isDev = process.env.NODE_ENV === 'development';

// the development window gets its icon on linux from this desktop entry, which only exists while it runs
if (isDev && process.platform === 'linux') {
  const dataHome = process.env.XDG_DATA_HOME || join(app.getPath('home'), '.local/share');

  app.setDesktopName('emusic-dev.desktop');
  registerDevDesktopEntry(dataHome, resolve(__dirname, '../icons/png/512x512.png'));
  app.on('will-quit', () => removeDevDesktopEntry(dataHome));
}

// the entry the AppImage launcher installs (electron/appImageLauncher.ts), so the running window gets its icon in the dock and taskbar
if (!isDev && process.platform === 'linux') {
  app.setDesktopName('emusic.desktop');
}

const isMockUpdate = !app.isPackaged && process.env.MOCK_UPDATE === '1';

const argv = minimist(process.argv.slice(2));

global._appDataPath = getAppDataPath(app.getPath('appData'), packageInfo.name, isDev);
const appDataPath = global._appDataPath;

const windows: AppWindows = {
  main: null,
  loading: null,
};

let windowLocation: string | undefined;
let loadingLocation: string | undefined;

if (argv.webpackPort) {
  windowLocation = `http://localhost:${argv.webpackPort}/index.html`;
  loadingLocation = `http://localhost:${argv.webpackPort}/loading.html`;
}

function setAppId() {
  global._appId = getAppUserModelId(isDev, process.env.NODE_ENV);

  if (isWin) {
    app.setAppUserModelId(global._appId);
    console.log('Registered app ID', global._appId);
  }

  if (isWin && isDev) {
    const shortcutPath = `${app.getPath('appData')}\\Microsoft\\Windows\\Start Menu\\Programs\\eMusic${isDev ? '-' + process.env.NODE_ENV : ''}.lnk`;

    if (fs.existsSync(shortcutPath)) {
      fs.unlinkSync(shortcutPath);
    }

    ws.create(
      shortcutPath,
      {
        target: process.execPath,
        desc: packageInfo.description,
        workingDir: rootPath,
        icon: resolve(rootPath, './icons/win/icon.ico'),
      },
      (err) => {
        if (err) throw err;

        ws.addAppId(shortcutPath, global._appId, (err) => {
          if (err) throw err;
        });
      }
    );
  }
}

const initWindow = () => {
  setAppId();
  windows.main = createWindow();
  windows.main.loadURL(windowLocation ?? '');

  windows.main.on('closed', () => {
    windows.main = null;
    windows.loading = null;
  });
};

if (!fs.existsSync(appDataPath)) {
  fs.mkdirSync(appDataPath);
}

const libraryLocation = resolve(appDataPath, './library.sqlite');

const radio = createRadioBrowser(`eMusic/${app.getVersion()}`);

const getPort = () =>
  setupServer({
    resolveStream: radio.resolveStream,
    onTitle: (uuid, title) => windows.main?.webContents.send('RADIO_STREAM_TITLE', { uuid, title }),
  }).then((port) => {
    if (!windowLocation || !loadingLocation) {
      windowLocation = `http://127.0.0.1:${port}/app/index.html?port=${port}`;
      loadingLocation = `http://127.0.0.1:${port}/app/loading.html`;
    } else {
      windowLocation += `?port=${port}`;
    }
  });

const getUpdateSource = (): UpdateSource | undefined => {
  if (isMockUpdate) return createMockUpdateSource();

  return canUpdate(app.isPackaged, process.platform, process.env) ? autoUpdater : undefined;
};

// the splash stays up while the update is checked and downloaded, the app starts once it is done
const updateOnSplash = async (loading: BrowserWindow) => {
  const source = getUpdateSource();
  if (!source) return;

  return runUpdate(source, (progress) => loading.webContents.send('SPLASH_PROGRESS', progress), { install: !isMockUpdate });
};

app
  .whenReady()
  .then(getPort)
  .then(async () => {
    const loading = getLoadingWindow();
    windows.loading = loading;
    loading.once('ready-to-show', () => {
      loading.show();
      if (isWin) loading.setBackgroundMaterial('acrylic');
    });
    await loading.loadURL(loadingLocation ?? '');

    return updateOnSplash(loading);
  })
  .then(() => createDatabase(libraryLocation))
  .then((d) => {
    console.log(`Connected to library ${libraryLocation}`);
    global._database = d;

    initWindow();
    setupListeners(d, windows, radio);

    // the native sqlite3 addon aborts the process when it is torn down with the database open, so it is closed before the app exits
    let databaseClosed = false;
    app.on('will-quit', (event) => {
      if (databaseClosed) return;

      event.preventDefault();
      databaseClosed = true;
      closeDatabase(d).then(() => app.quit());
    });

    app.on('window-all-closed', () => {
      if (!isMac) {
        app.quit();
      }
    });
  })
  .catch((msg) => {
    console.error(msg);
    process.exit(1);
  });
