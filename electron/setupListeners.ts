import type { Database } from 'sqlite3';
import type { AppWindows } from '../types/global';
import type { ListenerContext } from './listenerContext';
import registerWindowListeners from './registerWindowListeners';
import registerStateListeners from './registerStateListeners';
import registerLibraryListeners from './registerLibraryListeners';
import registerPlaylistDownload from './registerPlaylistDownload';

const registrars: ((context: ListenerContext) => void)[] = [
  registerWindowListeners,
  registerStateListeners,
  registerLibraryListeners,
  registerPlaylistDownload,
];

function setupListeners(database: Database, windows: AppWindows) {
  registrars.forEach((register) => register({ database, windows }));
}

export default setupListeners;
