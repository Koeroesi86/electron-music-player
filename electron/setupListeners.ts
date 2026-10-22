import type { Database } from 'sqlite3';
import type { AppWindows } from '../types/global';
import type { RadioBrowser } from './radioBrowser';
import type { ListenerContext } from './listenerContext';
import registerWindowListeners from './registerWindowListeners';
import registerStateListeners from './registerStateListeners';
import registerLibraryListeners from './registerLibraryListeners';
import registerPlaylistDownload from './registerPlaylistDownload';
import registerRadioListeners from './registerRadioListeners';

const registrars: ((context: ListenerContext) => void)[] = [
  registerWindowListeners,
  registerStateListeners,
  registerLibraryListeners,
  registerPlaylistDownload,
  registerRadioListeners,
];

function setupListeners(database: Database, windows: AppWindows, radio: RadioBrowser) {
  registrars.forEach((register) => register({ database, windows, radio }));
}

export default setupListeners;
