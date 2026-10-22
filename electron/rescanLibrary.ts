import fs from 'fs';
import type { WebContents } from 'electron';
import type { Database } from 'sqlite3';
import type { Folder } from '../types/library';
import { deleteTracks, getFolders, getLibrary, saveFolders } from './libraryRepository';
import scanFolders from './scanFolders';

const exists = (filePath: string) =>
  fs.promises.access(filePath).then(
    () => true,
    () => false
  );

const readModifiedTimes = async (folders: Folder[]) => {
  const times = await Promise.all(folders.map(async (folder) => [folder.path, await fs.promises.stat(folder.path).catch(() => undefined)] as const));
  return new Map(times.flatMap(([folderPath, stat]) => (stat ? [[folderPath, Math.floor(stat.mtimeMs)] as const] : [])));
};

const removeMissingTracks = async (database: Database) => {
  const tracks = await getLibrary(database);
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
    const folders = await getFolders(database);
    const modified = await readModifiedTimes(folders);
    const changed = folders.filter((folder) => (forced ? modified.has(folder.path) : folder.lastModified < (modified.get(folder.path) ?? 0)));

    await scanFolders(changed, sender);
    // stored after the scan, with the time seen before it, so a failed or interrupted scan is retried
    await saveFolders(
      database,
      changed.map((folder) => ({ path: folder.path, lastModified: modified.get(folder.path) ?? folder.lastModified }))
    );
    await removeMissingTracks(database);
    sender.send('RESCAN_COMPLETE', {});
  } catch (e) {
    console.error(e);
  }
}

export default rescanLibrary;
