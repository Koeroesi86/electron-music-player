import { app, ipcMain } from 'electron';
import type { WebContents } from 'electron';
import { join, resolve } from 'path';
import { disableLauncher, enableLauncher, isLauncherEnabled, syncLauncher } from './appImageLauncher';
import type { LauncherOptions } from './appImageLauncher';

// the menu entry is only offered from an AppImage, it has no install step of its own
const appImage = process.platform === 'linux' ? process.env.APPIMAGE : undefined;

const getOptions = (): LauncherOptions => ({
  dataHome: process.env.XDG_DATA_HOME || join(app.getPath('home'), '.local/share'),
  iconsPath: resolve(__dirname, '../../icons/png'),
});

const sendState = (sender: WebContents) =>
  isLauncherEnabled(getOptions().dataHome).then((enabled) => sender.send('LAUNCHER_STATE', { available: true, enabled }));

const isEnabledRequest = (payload: unknown): payload is { enabled: boolean } =>
  typeof payload === 'object' && payload !== null && 'enabled' in payload && typeof payload.enabled === 'boolean';

const registerLauncherListeners = () => {
  if (!appImage) return;

  syncLauncher(appImage, getOptions()).catch((e) => console.error(e));

  ipcMain.on('APP_READY', (event) => {
    sendState(event.sender).catch((e) => console.error(e));
  });

  ipcMain.on('SET_LAUNCHER', (event, payload: unknown) => {
    if (!isEnabledRequest(payload)) return;

    (payload.enabled ? enableLauncher(appImage, getOptions()) : disableLauncher(getOptions()))
      .catch((e) => console.error(e))
      .then(() => sendState(event.sender))
      .catch((e) => console.error(e));
  });
};

export default registerLauncherListeners;
