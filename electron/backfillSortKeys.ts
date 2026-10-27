import type { Database } from 'sqlite3';
import type { Track } from '../types/library';
import executeQuery from './executeQuery';
import executeQueries from './executeQueries';
import { toSortKeys } from './sortKey';

/** Fills the sort keys of the tracks that were added before there were any (migration 006), nothing is done once every track has them */
const backfillSortKeys = (database: Database) =>
  executeQuery<Pick<Track, 'path' | 'title' | 'artist' | 'album'>>(database, {
    query: `SELECT path, title, artist, album FROM library WHERE title_key IS NULL OR artist_key IS NULL OR album_key IS NULL`,
    variables: [],
  }).then((tracks) =>
    executeQueries(
      database,
      tracks.map((track) => ({
        query: `UPDATE library SET title_key = ?, artist_key = ?, album_key = ? WHERE path = ?`,
        variables: [...toSortKeys(track), track.path],
      }))
    )
  );

export default backfillSortKeys;
