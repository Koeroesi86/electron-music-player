import { ipcMain } from 'electron';
import type { WebContents } from 'electron';
import type { ListenerContext } from './listenerContext';
import { getFolders } from './libraryRepository';
import { getSettings, saveSettings } from './settingsRepository';
import { setPickedLanguage } from './language';
import { applyThemeMode } from './theme';

// the window can be closed while the database answers
const sendIfAlive = (sender: WebContents, channel: string, payload: unknown) => {
  if (!sender.isDestroyed()) sender.send(channel, payload);
};

const sendState = async ({ database }: ListenerContext, sender: WebContents) => {
  sendIfAlive(sender, 'STORE_FOLDERS', { folders: await getFolders(database) });

  const settings = await getSettings(database);
  if (settings) sendIfAlive(sender, 'RESTORE_SETTINGS', { settings });
};

const registerStateListeners = (context: ListenerContext) => {
  ipcMain.on('APP_READY', (event) => {
    sendState(context, event.sender).catch((e) => console.error(e));
  });

  ipcMain.on('SAVE_SETTINGS', (event, settings: unknown) => {
    setPickedLanguage(settings);
    applyThemeMode(settings);
    saveSettings(context.database, settings)
      .then(() => sendIfAlive(event.sender, 'SETTINGS_SAVED', { settings }))
      .catch((e) => console.error(e));
  });
};

export default registerStateListeners;
