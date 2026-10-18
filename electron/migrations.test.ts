import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from 'sqlite3';
import executeQuery from './executeQuery';
import { createTestDatabase } from './test-database';

describe('migrations', () => {
  let database: Database;

  beforeEach(async () => {
    database = await createTestDatabase();
  });

  afterEach(() => {
    database.close();
  });

  it('creates the folders, library and settings tables', async () => {
    const tables = await executeQuery<{ name: string }>(database, {
      query: `SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`,
      variables: [],
    });

    expect(tables.map(({ name }) => name)).toEqual(expect.arrayContaining(['folders', 'library', 'settings']));
  });
});
