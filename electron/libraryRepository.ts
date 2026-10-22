import path from 'path';
import type { Database } from 'sqlite3';
import type { Folder, Track } from '../types/library';
import executeQuery from './executeQuery';
import executeQueries from './executeQueries';

// ! is the escape character of the LIKE below, so % and _ in a folder name match themselves
const escapeLike = (value: string) => value.replace(/[!%_]/g, '!$&');

export const getFolders = (database: Database) => executeQuery<Folder>(database, { query: `SELECT * FROM folders ORDER BY path ASC`, variables: [] });

/** The folders below a folder, the folder itself is not among them */
export const getFoldersInside = (database: Database, folderPath: string) =>
  executeQuery<Folder>(database, {
    query: `SELECT * FROM folders WHERE path LIKE ? ESCAPE '!'`,
    variables: [`${escapeLike(folderPath.replace(/[\\/]+$/, '') + path.sep)}%`],
  });

export const saveFolders = (database: Database, folders: Folder[]) =>
  executeQueries(
    database,
    folders.map((folder) => ({ query: `INSERT OR REPLACE INTO folders (path, lastModified) VALUES (?, ?)`, variables: [folder.path, folder.lastModified] }))
  );

export const deleteFolders = (database: Database, folders: Pick<Folder, 'path'>[]) =>
  executeQueries(
    database,
    folders.map((folder) => ({ query: `DELETE FROM folders WHERE path = ?`, variables: [folder.path] }))
  );

export const getLibrary = (database: Database) => executeQuery<Track>(database, { query: `SELECT * FROM library ORDER BY path ASC`, variables: [] });

export const findTrackPath = (database: Database, trackPath: string) =>
  executeQuery<Pick<Track, 'path'>>(database, { query: `SELECT path FROM library WHERE path = ?`, variables: [trackPath] }).then(([track]) => track?.path);

export const deleteTracks = (database: Database, tracks: Pick<Track, 'path'>[]) =>
  executeQueries(
    database,
    tracks.map((track) => ({ query: `DELETE FROM library WHERE path = ?`, variables: [track.path] }))
  );
