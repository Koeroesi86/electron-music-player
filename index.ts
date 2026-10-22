import { app } from 'electron';
import { resolve, basename } from 'path';
import fs from 'fs';
import minimist from 'minimist';
import fp from 'find-free-port';
import ws from 'windows-shortcuts-appid';
import type { AppWindows } from './types/global';
import getAppDataPath from './electron/appDataPath';
import createWindow from './electron/createWindow';
import getLoadingWindow from './electron/getLoadingWindow';
import createDatabase from './electron/createDatabase';
import setupListeners from './electron/setupListeners';
import setupServer from './electron/setupServer';
import { createRadioBrowser } from './electron/radioBrowser';

// compiled to out/index.js, the project root is one level up
const rootPath = resolve(__dirname, '..');
const packageInfo: { name: string; description: string } = JSON.parse(fs.readFileSync(resolve(rootPath, 'package.json'), 'utf8'));

process.env.ELECTRON_ENABLE_LOGGING = '1';

const isWin = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const isDev = process.env.NODE_ENV === 'development';

// scripts/prebuild.js registers this desktop entry, which gives the development window its icon on linux
if (isDev && process.platform === 'linux') {
  app.setDesktopName('emusic-dev.desktop');
}

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
  const exeName = basename(process.execPath).replace(/\.exe$/i, '');

  if (isDev) {
    global._appId = `com.squirrel.${exeName}-${process.env.NODE_ENV}`;
  } else {
    global._appId = `com.squirrel.${exeName}`;
  }

  if (isWin && isDev) {
    app.setAppUserModelId(global._appId);
    console.log('Registered app ID', global._appId);

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

const getPort = () => {
  return fp(3000, '127.0.0.1').then((freePorts) => {
    global._port = freePorts[0];
    if (!windowLocation || !loadingLocation) {
      windowLocation = `http://127.0.0.1:${global._port}/app/index.html?port=${global._port}`;
      loadingLocation = `http://127.0.0.1:${global._port}/app/loading.html`;
    } else {
      windowLocation += `?port=${global._port}`;
    }

    setupServer({
      resolveStream: radio.resolveStream,
      onTitle: (uuid, title) => windows.main?.webContents.send('RADIO_STREAM_TITLE', { uuid, title }),
    });
  });
};

app
  .whenReady()
  .then(getPort)
  .then(() => {
    const loading = getLoadingWindow();
    windows.loading = loading;
    loading.loadURL(loadingLocation ?? '');
    loading.once('ready-to-show', () => {
      loading.show();
      if (isWin) loading.setBackgroundMaterial('acrylic');
    });
  })
  .then(() => createDatabase(libraryLocation))
  .then((d) => {
    console.log(`Connected to library ${libraryLocation}`);
    global._database = d;

    initWindow();
    setupListeners(d, windows, radio);

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
