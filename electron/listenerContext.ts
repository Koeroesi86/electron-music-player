import type { Database } from 'sqlite3';
import type { AppWindows } from '../types/global';
import type { RadioBrowser } from './radioBrowser';

export interface ListenerContext {
  database: Database;
  windows: AppWindows;
  radio: RadioBrowser;
}
