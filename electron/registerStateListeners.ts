import { ipcMain } from 'electron';
import type { WebContents } from 'electron';
import type { ListenerContext } from './listenerContext';
import { getFolders } from './libraryRepository';
import { getSettings, saveSettings } from './settingsRepository';

const sendState = async ({ database }: ListenerContext, sender: WebContents) => {
  sender.send('STORE_FOLDERS', { folders: await getFolders(database) });

  const settings = await getSettings(database);
  if (settings) sender.send('RESTORE_SETTINGS', { settings });
};

const registerStateListeners = (context: ListenerContext) => {
  ipcMain.on('APP_READY', (event) => {
    sendState(context, event.sender).catch((e) => console.error(e));
  });

  ipcMain.on('SAVE_SETTINGS', (event, settings: unknown) => {
    saveSettings(context.database, settings)
      .then(() => event.sender.send('SETTINGS_SAVED', { settings }))
      .catch((e) => console.error(e));
  });
};

export default registerStateListeners;
