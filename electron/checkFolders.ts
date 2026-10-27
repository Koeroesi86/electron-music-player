import type { WebContents } from 'electron';
import type { Database } from 'sqlite3';
import { reportOfflineFolders } from './folderAvailability';
import rescanLibrary from './rescanLibrary';

/** Tell the window which library folders are offline, and rescan when one of them came back */
async function checkFolders(database: Database, sender: WebContents) {
  const { recovered } = await reportOfflineFolders(database, sender);
  if (recovered.length > 0) await rescanLibrary(sender);
}

export default checkFolders;
