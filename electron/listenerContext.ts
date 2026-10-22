import type { Database } from 'sqlite3';
import type { AppWindows } from '../types/global';

export interface ListenerContext {
  database: Database;
  windows: AppWindows;
}
