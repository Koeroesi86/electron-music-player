import path from 'path';
import type { Database } from 'sqlite3';
import type { AlbumSummary, AudioFormat, Folder, LibraryPage, Track } from '../types/library';
import type { AlbumSort, AlbumSortField, LibraryQuery, SortDirection, TrackSort, TrackSortField } from '../types/library-query';
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
/** The format the library holds of a track, undefined for a track it does not have */
export const findTrackFormat = (database: Database, trackPath: string) =>
  executeQuery<AudioFormat>(database, {
    query: `SELECT codec, bitDepth, sampleRate, bitrate, vbr, lossless FROM library WHERE path = ?`,
    variables: [trackPath],
  }).then(([format]) => format);

export const deleteTracksInside = (database: Database, folderPath: string) =>
  executeQuery(database, {
    query: `DELETE FROM library WHERE path LIKE ? ESCAPE '!'`,
    variables: [`${escapeLike(folderPath.replace(/[\\/]+$/, '') + path.sep)}%`],
  });

/** Whether the library has a track below a folder */
export const hasTracksInside = (database: Database, folderPath: string) =>
  executeQuery<{ found: number }>(database, {
    query: `SELECT 1 AS found FROM library WHERE path LIKE ? ESCAPE '!' LIMIT 1`,
    variables: [`${escapeLike(folderPath.replace(/[\\/]+$/, '') + path.sep)}%`],
  }).then((rows) => rows.length > 0);

// the folder of a track including the trailing separator, for both separators: rtrim drops the characters after the last one
const folderOf = `rtrim(path, replace(replace(path, '/', ''), '\\', ''))`;

const countTotal = (database: Database, query: string, variables: unknown[]) =>
  executeQuery<{ total: number }>(database, { query, variables }).then(([row]) => row.total);

/** How a field is ordered: when its value is empty (empty values come last in both directions) and the value itself */
interface FieldOrder {
  empty: string;
  value: string;
}

/** A text is sorted by its key column (no case, no accents), a text without a key (not filled yet) is empty */
const textOrder = (key: string): FieldOrder => ({ empty: `COALESCE(${key}, '') = ''`, value: key });

/** The numbers are stored as text (`3`, `3/12`, `2001-05-03`), the leading number is taken; 0 and no number at all are empty */
const numberOrder = (expression: string): FieldOrder => ({
  empty: `NULLIF(CAST(${expression} AS REAL), 0) IS NULL`,
  value: `NULLIF(CAST(${expression} AS REAL), 0)`,
});

const trackOrders: Record<TrackSortField, FieldOrder> = {
  title: textOrder('title_key'),
  artist: textOrder('artist_key'),
  album: textOrder('album_key'),
  year: numberOrder('year'),
  duration: numberOrder('duration'),
  track: numberOrder('track'),
};

// the artist and the year are the bare columns of the row of MIN(path), the first track of the album
const albumOrders: Record<AlbumSortField, FieldOrder> = {
  title: textOrder('album_key'),
  artist: textOrder('artist_key'),
  year: numberOrder('year'),
  // never empty; not a bare 0, which ORDER BY takes for the position of a column
  trackCount: { empty: '(1 = 0)', value: 'COUNT(*)' },
  duration: numberOrder('SUM(duration)'),
};

const directions: Record<SortDirection, string> = { asc: 'ASC', desc: 'DESC' };

/**
 * The ORDER BY of a sort, built from the whitelists above and never from the incoming text: an unknown field or direction gives the default order.
 * Ties keep the default order (`tieBreaker`), also in the descending direction, so equal rows do not move
 */
const toOrderBy = <F extends string>(orders: Record<F, FieldOrder>, sort: { field: F; direction: SortDirection } | undefined, tieBreaker: string) => {
  const order = sort && Object.hasOwn(orders, sort.field) ? orders[sort.field] : undefined;
  const direction = sort ? directions[sort.direction] : undefined;

  return order && direction ? `${order.empty} ASC, ${order.value} ${direction}, ${tieBreaker} ASC` : `${tieBreaker} ASC`;
};

/** The library folders as the bound conditions on a path; no folder is no condition, the tracks of every folder */
const toFolderFilter = (folders: string[]) => {
  const prefixes = folders.flatMap((folder) => ['/', '\\'].map((separator) => `${escapeLike(folder.replace(/[\\/]+$/, '') + separator)}%`));

  return {
    where: prefixes.length ? `WHERE ${prefixes.map(() => `path LIKE ? ESCAPE '!'`).join(' OR ')}` : '',
    variables: prefixes,
  };
};

/** The tracks in the order of the sort, in the default order (by path) when there is none, limited to the tracks below the folders when there are any */
export const getLibrary = (database: Database, { sort, folders }: LibraryQuery<TrackSort> = { sort: undefined, folders: [] }) => {
  const filter = toFolderFilter(folders);

  return executeQuery<Track>(database, {
    query: `SELECT * FROM library ${filter.where} ORDER BY ${toOrderBy(trackOrders, sort, 'path')}`,
    variables: filter.variables,
  });
};

/** A page of the tracks in the order of getLibrary, with the number of tracks it has */
export const getTrackPage = (database: Database, offset: number, limit: number, { sort, folders }: LibraryQuery<TrackSort>): Promise<LibraryPage<Track>> => {
  const filter = toFolderFilter(folders);

  return Promise.all([
    executeQuery<Track>(database, {
      query: `SELECT * FROM library ${filter.where} ORDER BY ${toOrderBy(trackOrders, sort, 'path')} LIMIT ? OFFSET ?`,
      variables: [...filter.variables, limit, offset],
    }),
    countTotal(database, `SELECT COUNT(*) AS total FROM library ${filter.where}`, filter.variables),
  ]).then(([items, total]) => ({ items, total }));
};

/**
 * A page of the albums, a folder and an album title make one album. The default order is the first track of the album;
 * a sort by the artist or the year takes the value of that first track, and the albums that are equal keep the default order.
 * Limited to the albums of the tracks below the folders when there are any, with the number of albums
 */
export const getAlbumPage = (
  database: Database,
  offset: number,
  limit: number,
  { sort, folders }: LibraryQuery<AlbumSort>
): Promise<LibraryPage<AlbumSummary>> => {
  const filter = toFolderFilter(folders);

  return Promise.all([
    executeQuery<Omit<AlbumSummary, 'id' | 'path'> & { firstPath: string }>(database, {
      // the bare columns come from the row of MIN(path), the first track of the album
      query: `SELECT COALESCE(album, '') AS title, artist, picture AS cover, year, SUM(duration) AS duration, COUNT(*) AS trackCount, MIN(path) AS firstPath
        FROM (SELECT *, ${folderOf} AS folder FROM library ${filter.where}) GROUP BY folder, COALESCE(album, '')
        ORDER BY ${toOrderBy(albumOrders, sort, 'MIN(path)')} LIMIT ? OFFSET ?`,
      variables: [...filter.variables, limit, offset],
    }),
    countTotal(
      database,
      `SELECT COUNT(*) AS total FROM (SELECT 1 FROM (SELECT album, ${folderOf} AS folder FROM library ${filter.where}) GROUP BY folder, COALESCE(album, ''))`,
      filter.variables
    ),
  ]).then(([albums, total]) => ({
    items: albums.map(({ firstPath, ...album }) => ({ ...album, path: path.dirname(firstPath), id: `${path.dirname(firstPath)} - ${album.title}` })),
    total,
  }));
};

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
