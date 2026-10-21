import { ipcMain, nativeImage, session, shell } from 'electron';
import { resolve } from 'path';
import playlistParser from 'playlist-parser';
import type { Database } from 'sqlite3';
import type { AppWindows } from '../types/global';
import type { Folder } from '../types/library';
import executeQuery from './executeQuery';
import addFoldersToLibrary from './addFoldersToLibrary';
import rescanLibrary from './rescanLibrary';
import openLibraryPath from './openLibraryPath';

const isWin = process.platform === 'win32';
const enableTransparency = true;

function setupListeners(database: Database, windows: AppWindows) {
  const getMain = () => {
    if (!windows.main) throw new Error('Main window is not available');
    return windows.main;
  };

  // loading.openDevTools()

  ipcMain.once('APP_LOADED', () => {
    setTimeout(() => {
      getMain().show();
      if (enableTransparency) {
        if (isWin) getMain().setBackgroundMaterial('acrylic');
        else getMain().setVibrancy('under-window');
      }
      windows.loading?.close();
      windows.loading = null;

      // getMain().webContents.openDevTools()

      if (isWin) {
        getMain().setThumbarButtons([
          {
            tooltip: 'Play',
            icon: nativeImage.createFromPath(resolve(__dirname, '../../assets/icons_play.png')),
            click() {
              console.log('play clicked');
              getMain().webContents.send('SET_PLAYING', { isPlaying: true });
            },
          },
          {
            tooltip: 'Pause',
            icon: nativeImage.createFromPath(resolve(__dirname, '../../assets/icons_pause.png')),
            click() {
              console.log('pause clicked.');
              getMain().webContents.send('SET_PLAYING', { isPlaying: false });
            },
          },
        ]);
      }
    }, 200);
  });

  ipcMain.on('CLOSE_APP', () => {
    getMain().close();
  });

  ipcMain.on('MINIMIZE_APP', () => {
    getMain().minimize();
  });

  let isMaximized = false;
  ipcMain.on('MAXIMIZE_APP', () => {
    // getMain().isMaximized() is not working
    if (isMaximized) {
      getMain().unmaximize();
    } else {
      getMain().maximize();
    }
  });

  getMain().on('maximize', () => {
    isMaximized = true;
    getMain().webContents.send('MAXIMIZED_APP', { maximized: isMaximized });
  });

  getMain().on('unmaximize', () => {
    isMaximized = false;
    getMain().webContents.send('MAXIMIZED_APP', { maximized: isMaximized });
  });

  ipcMain.on('APP_READY', (event) => {
    // main.openDevTools()
    Promise.resolve()
      .then(() =>
        executeQuery<Folder>(database, {
          query: `SELECT * FROM folders ORDER BY path ASC`,
          variables: [],
        })
      )
      .then((folders) => {
        event.sender.send('STORE_FOLDERS', { folders });
      })
      .then(() =>
        executeQuery<{ settings: string }>(database, {
          query: `SELECT settings FROM settings WHERE id = ?`,
          variables: [1],
        })
      )
      .then((s) => {
        if (s[0]) {
          const { settings } = s[0];
          event.sender.send('RESTORE_SETTINGS', { settings: JSON.parse(settings) });
        }
      })
      .catch((e) => console.error(e));
  });

  ipcMain.on('ADD_FOLDERS_TO_LIBRARY', (event, files: unknown) => {
    addFoldersToLibrary(database, files, event.sender).catch((e) => console.error(e));
  });

  ipcMain.on('RESCAN_LIBRARY', (event, payload: unknown) => {
    rescanLibrary(event.sender, typeof payload === 'object' && payload !== null && 'forced' in payload && payload.forced === true);
  });

  ipcMain.on('OPEN_LIBRARY_PATH', (_event, target: unknown) => {
    openLibraryPath(database, target, (folder) => shell.openPath(folder)).catch((e) => console.error(e));
  });

  session.defaultSession.on('will-download', (event, item) => {
    event.preventDefault();
    const url = item.getURL();
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to download ${url}: ${response.status}`);
        }
        return response.text();
      })
      .then((body) => {
        const playlist = playlistParser.PLS.parse(body);
        getMain().webContents.send('CLICKED_URL', { playlist, url });
      })
      .catch((error) => console.error(error));
  });

  ipcMain.on('NOTIFICATION_CLICKED', () => {
    getMain().setAlwaysOnTop(true);
    getMain().show();
    getMain().focus();
    getMain().setAlwaysOnTop(false);
  });

  ipcMain.on('SAVE_SETTINGS', (event, settings) => {
    Promise.resolve()
      .then(() =>
        executeQuery(database, {
          query: `INSERT OR REPLACE INTO settings (id, settings) VALUES (?, ?)`,
          variables: [1, JSON.stringify(settings)],
        })
      )
      .then(() => {
        event.sender.send('SETTINGS_SAVED', { settings });
      })
      .catch((e) => console.error(e));
  });
}

export default setupListeners;
