import fs from 'fs';
import path from 'path';
import type { Database } from 'sqlite3';
import type { WebContents } from 'electron';
import type { Folder } from '../types/library';
import executeQueries from './executeQueries';
import scanFolders from './scanFolders';

interface AddedFile {
  path: string;
  lastModified: number;
}

const isAddedFile = (item: unknown): item is AddedFile =>
  typeof item === 'object' &&
  item !== null &&
  'path' in item &&
  typeof item.path === 'string' &&
  'lastModified' in item &&
  typeof item.lastModified === 'number';

const isDirectory = (filePath: string) => {
  try {
    return fs.statSync(filePath).isDirectory();
  } catch {
    return false;
  }
};

// ! is the escape character of the LIKE below, so % and _ in a folder name match themselves
const escapeLike = (value: string) => value.replace(/[!%_]/g, '!$&');

/** Add the directories among the dropped files to the library, replacing the folders inside them, and scan them */
async function addFoldersToLibrary(database: Database, payload: unknown, sender: WebContents) {
  const folders = (Array.isArray(payload) ? payload : []).filter(isAddedFile).filter((file) => isDirectory(file.path));

  const nested = await executeQueries<Folder>(
    database,
    folders.map((folder) => ({
      query: `SELECT * FROM folders WHERE path LIKE ? ESCAPE '!'`,
      variables: [`${escapeLike(folder.path.replace(/[\\/]+$/, '') + path.sep)}%`],
    }))
  );
  await executeQueries(
    database,
    nested.flat().map((folder) => ({ query: `DELETE FROM folders WHERE path = ?`, variables: [folder.path] }))
  );
  await executeQueries(
    database,
    folders.map((folder) => ({ query: `INSERT OR REPLACE INTO folders (path, lastModified) VALUES (?, ?)`, variables: [folder.path, folder.lastModified] }))
  );
  sender.send('FOLDERS_ADDED_TO_LIBRARY', { folders });

  await scanFolders(folders, sender);
  sender.send('TRACKS_ADDED_TO_LIBRARY', {});
}

export default addFoldersToLibrary;
