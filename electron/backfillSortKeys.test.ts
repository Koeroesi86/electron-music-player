import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from 'sqlite3';
import backfillSortKeys from './backfillSortKeys';
import executeQuery from './executeQuery';
import { createTestDatabase } from './test-database';

const insertWithoutKeys = (database: Database, path: string, title: string) =>
  executeQuery(database, { query: `INSERT INTO library (path, title, artist, album) VALUES (?, ?, 'Ártist', NULL)`, variables: [path, title] });

const keysOf = (database: Database) =>
  executeQuery<{ path: string; title_key: string; artist_key: string; album_key: string }>(database, {
    query: `SELECT path, title_key, artist_key, album_key FROM library ORDER BY path`,
    variables: [],
  });

describe('backfillSortKeys', () => {
  let database: Database;

  beforeEach(async () => {
    database = await createTestDatabase();
  });

  afterEach(() => {
    database.close();
  });

  it('fills the keys of the tracks from before the keys existed', async () => {
    await insertWithoutKeys(database, '/m/1', 'Ékes');
    await insertWithoutKeys(database, '/m/2', 'Zebra');

    await backfillSortKeys(database);

    expect(await keysOf(database)).toEqual([
      { path: '/m/1', title_key: 'ekes', artist_key: 'artist', album_key: '' },
      { path: '/m/2', title_key: 'zebra', artist_key: 'artist', album_key: '' },
    ]);
  });

  it('leaves the tracks that have keys, and does nothing for an empty library', async () => {
    await backfillSortKeys(database);
    await executeQuery(database, {
      query: `INSERT INTO library (path, title_key, artist_key, album_key) VALUES ('/m/1', 'kept', 'kept', 'kept')`,
      variables: [],
    });

    await backfillSortKeys(database);

    expect(await keysOf(database)).toEqual([{ path: '/m/1', title_key: 'kept', artist_key: 'kept', album_key: 'kept' }]);
  });
});
