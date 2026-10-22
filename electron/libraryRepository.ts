import path from 'path';
import type { Database } from 'sqlite3';
import type { AlbumSummary, Folder, LibraryPage, Track } from '../types/library';
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

/** Remove the tracks below a folder from the library, the files stay on disk */
export const deleteTracksInside = (database: Database, folderPath: string) =>
  executeQuery(database, {
    query: `DELETE FROM library WHERE path LIKE ? ESCAPE '!'`,
    variables: [`${escapeLike(folderPath.replace(/[\\/]+$/, '') + path.sep)}%`],
  });

export const getLibrary = (database: Database) => executeQuery<Track>(database, { query: `SELECT * FROM library ORDER BY path ASC`, variables: [] });

// the folder of a track including the trailing separator, for both separators: rtrim drops the characters after the last one
const folderOf = `rtrim(path, replace(replace(path, '/', ''), '\\', ''))`;

const countTotal = (database: Database, query: string) => executeQuery<{ total: number }>(database, { query, variables: [] }).then(([row]) => row.total);

/** A page of the tracks in the order of getLibrary, with the number of tracks in the library */
export const getTrackPage = (database: Database, offset: number, limit: number): Promise<LibraryPage<Track>> =>
  Promise.all([
    executeQuery<Track>(database, { query: `SELECT * FROM library ORDER BY path ASC LIMIT ? OFFSET ?`, variables: [limit, offset] }),
    countTotal(database, `SELECT COUNT(*) AS total FROM library`),
  ]).then(([items, total]) => ({ items, total }));

/** A page of the albums, a folder and an album title make one album, ordered by the first track of the album, with the number of albums */
export const getAlbumPage = (database: Database, offset: number, limit: number): Promise<LibraryPage<AlbumSummary>> =>
  Promise.all([
    executeQuery<Omit<AlbumSummary, 'id' | 'path'> & { firstPath: string }>(database, {
      // the bare columns come from the row of MIN(path), the first track of the album
      query: `SELECT COALESCE(album, '') AS title, artist, picture AS cover, year, SUM(duration) AS duration, COUNT(*) AS trackCount, MIN(path) AS firstPath
        FROM (SELECT *, ${folderOf} AS folder FROM library) GROUP BY folder, COALESCE(album, '') ORDER BY MIN(path) ASC LIMIT ? OFFSET ?`,
      variables: [limit, offset],
    }),
    countTotal(database, `SELECT COUNT(*) AS total FROM (SELECT 1 FROM (SELECT album, ${folderOf} AS folder FROM library) GROUP BY folder, album)`),
  ]).then(([albums, total]) => ({
    items: albums.map(({ firstPath, ...album }) => ({ ...album, path: path.dirname(firstPath), id: `${path.dirname(firstPath)} - ${album.title}` })),
    total,
  }));

/** The tracks of an album, folder is the directory of the album */
export const getAlbumTracks = (database: Database, folder: string, album: string) =>
  executeQuery<Track>(database, {
    query: `SELECT * FROM library WHERE ${folderOf} IN (?, ?, ?) AND COALESCE(album, '') = ? ORDER BY path ASC`,
    variables: [folder, `${folder}/`, `${folder}\\`, album],
  });

export const findTrackPath = (database: Database, trackPath: string) =>
  executeQuery<Pick<Track, 'path'>>(database, { query: `SELECT path FROM library WHERE path = ?`, variables: [trackPath] }).then(([track]) => track?.path);

export const deleteTracks = (database: Database, tracks: Pick<Track, 'path'>[]) =>
  executeQueries(
    database,
    tracks.map((track) => ({ query: `DELETE FROM library WHERE path = ?`, variables: [track.path] }))
  );
