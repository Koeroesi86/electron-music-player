import { app, dialog } from 'electron';
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
import { libraryErrorMessage } from './electron/libraryErrorMessage';
import setupListeners from './electron/setupListeners';
import { emusicOrigin, handleEmusicProtocol, registerEmusicScheme } from './electron/emusicProtocol';
import { createRadioBrowser } from './electron/radioBrowser';
import { createRadioArt } from './electron/radioArt';
import { createRadioLogos } from './electron/radioLogos';
import { getAppUserModelId } from './electron/appUserModelId';
import { registerDevDesktopEntry, removeDevDesktopEntry } from './electron/devDesktopEntry';
import closeDatabase from './electron/closeDatabase';
import { getMainTranslator, setPickedLanguage } from './electron/language';
import { applyThemeMode } from './electron/theme';
import { getSettings } from './electron/settingsRepository';
import { autoUpdater } from 'electron-updater';
import { createMockUpdateSource, getUpdateUnavailableReason, runUpdate } from './electron/updater';
import { createUpdateManager } from './electron/updateManager';
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

// the page is served by the emusic protocol; a development run loads it from the dev server, which asks the protocol across origins
const devOrigin = argv.webpackPort ? `http://localhost:${argv.webpackPort}` : undefined;
const pageOrigin = devOrigin ?? emusicOrigin;
const windowLocation = `${pageOrigin}/index.html`;
const loadingLocation = `${pageOrigin}/loading.html`;

// before the app is ready
registerEmusicScheme();

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
  windows.main.loadURL(windowLocation);

  windows.main.on('closed', () => {
    windows.main = null;
    windows.loading = null;
  });
};

if (!fs.existsSync(appDataPath)) {
  fs.mkdirSync(appDataPath);
}

const libraryLocation = resolve(appDataPath, './library.sqlite');

// a test run asks a directory of its own, the real one needs the network
const radio = createRadioBrowser(`eMusic/${app.getVersion()}`, process.env.EMUSIC_RADIO_DIRECTORY);

const radioArt = createRadioArt();

const radioLogos = createRadioLogos(radio.getLogoUrl);

const serveApp = () =>
  handleEmusicProtocol({
    getDatabase: () => global._database,
    appRoot: resolve(rootPath, 'build'),
    devOrigin,
    radio: {
      resolveStream: radio.resolveStream,
      getArt: radioArt.get,
      getLogo: radioLogos.get,
      onTitle: (uuid, title, streamUrl) => {
        windows.main?.webContents.send('RADIO_STREAM_TITLE', { uuid, title });
        radioArt
          .lookup(title, streamUrl)
          .then((art) => art && windows.main?.webContents.send('RADIO_STREAM_ART', { uuid, title, art }))
          .catch((error) => console.error(error));
      },
    },
  });

// a development run updates from the mock source only when asked to
const unavailable = isMockUpdate ? undefined : getUpdateUnavailableReason(app.isPackaged, process.platform, process.env);

const getUpdateSource = (): UpdateSource | undefined => {
  if (isMockUpdate) return createMockUpdateSource();

  return unavailable ? undefined : autoUpdater;
};

// the splash and the settings share one source; the settings flow starts after the splash one is done
const updateSource = getUpdateSource();
const updates = createUpdateManager({
  source: updateSource,
  info: { version: app.getVersion(), electron: process.versions.electron, chrome: process.versions.chrome, unavailable },
  publish: (state) => windows.main?.webContents.send('UPDATE_STATE', state),
});

// the splash stays up while the update is checked and downloaded, the app starts once it is done
const updateOnSplash = async (loading: BrowserWindow) => {
  if (!updateSource) return;

  return runUpdate(updateSource, (progress) => loading.webContents.send('SPLASH_PROGRESS', progress), {
    install: !isMockUpdate,
    translate: getMainTranslator().t,
  });
};

app
  .whenReady()
  .then(serveApp)
  .then(async () => {
    const loading = getLoadingWindow();
    windows.loading = loading;
    loading.once('ready-to-show', () => {
      loading.show();
      if (isWin) loading.setBackgroundMaterial('acrylic');
    });
    await loading.loadURL(loadingLocation);
    // the splash page is static and shows the text the main process sends; the picked language is in the library, which opens after the splash
    loading.webContents.send('SPLASH_PROGRESS', { text: getMainTranslator().t('splash.loading', { title: 'eMusic' }) });

    return updateOnSplash(loading);
  })
  .then(() =>
    createDatabase(libraryLocation).catch((error) => {
      const translator = getMainTranslator();
      dialog.showErrorBox(translator.t('library.error.title'), libraryErrorMessage(translator, error));
      throw error;
    })
  )
  .then((d) => {
    console.log(`Connected to library ${libraryLocation}`);
    global._database = d;

    return getSettings(d)
      .then((settings) => {
        setPickedLanguage(settings);
        applyThemeMode(settings);
      })
      .then(() => d);
  })
  .then((d) => {
    initWindow();
    setupListeners(d, windows, radio, updates);

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
