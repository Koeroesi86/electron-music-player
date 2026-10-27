import fs from 'fs';
import type { WebContents } from 'electron';
import type { Database } from 'sqlite3';
import type { Folder } from '../types/library';
import { deleteTracks, getFolders, getLibrary, saveFolders } from './libraryRepository';
import { isInsideFolder, reportOfflineFolders, withTimeout } from './folderAvailability';
import scanFolders from './scanFolders';

// a file that does not answer in time is kept, only a file that is reported missing is removed
const exists = (filePath: string) =>
  withTimeout(
    fs.promises.access(filePath).then(
      () => true,
      () => false
    ),
    true
  );

const readModifiedTimes = async (folders: Folder[]) => {
  const times = await Promise.all(folders.map(async (folder) => [folder.path, await withTimeout(fs.promises.stat(folder.path), undefined)] as const));
  return new Map(times.flatMap(([folderPath, stat]) => (stat ? [[folderPath, Math.floor(stat.mtimeMs)] as const] : [])));
};

/** The tracks below an offline folder are kept, its files cannot be told from missing ones */
const removeMissingTracks = async (database: Database, offline: string[]) => {
  const tracks = (await getLibrary(database)).filter((track) => !offline.some((folderPath) => isInsideFolder(folderPath, track.path)));
  const present = await Promise.all(tracks.map((track) => exists(track.path)));
  const missing = tracks.filter((_track, index) => !present[index]);

  missing.forEach((track) => console.log(`Removing non existent ${track.path}`));
  console.log(`Removing ${missing.length} of ${tracks.length} songs`);
  await deleteTracks(database, missing);
};

async function rescanLibrary(sender: WebContents, forced = false) {
  const database = global._database;
  if (!database) return;
  console.log(`Scanning library ${forced ? 'completely' : 'wisely'}...`);

  try {
    const all = await getFolders(database);
    const { offline } = await reportOfflineFolders(database, sender, all);
    const folders = all.filter((folder) => !offline.includes(folder.path));
    const modified = await readModifiedTimes(folders);
    const changed = folders.filter((folder) => (forced ? modified.has(folder.path) : folder.lastModified < (modified.get(folder.path) ?? 0)));

    await scanFolders(changed, sender);
    // stored after the scan, with the time seen before it, so a failed or interrupted scan is retried
    await saveFolders(
      database,
      changed.map((folder) => ({ path: folder.path, lastModified: modified.get(folder.path) ?? folder.lastModified }))
    );
    await removeMissingTracks(database, offline);
    sender.send('RESCAN_COMPLETE', {});
  } catch (e) {
    console.error(e);
  }
}

export default rescanLibrary;
