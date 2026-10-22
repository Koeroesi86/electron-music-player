import { beforeEach, describe, expect, it } from 'vitest';
import type { Database } from 'sqlite3';
import { deleteFolders, deleteTracks, findTrackPath, getFolders, getFoldersInside, getLibrary, saveFolders } from './libraryRepository';
import addTrack from './addTrack';
import { createTestDatabase } from './test-database';
import type { Track } from '../types/library';

const track = (path: string): Track => ({ path, artist: '', album: '', title: '', year: '', track: '', disk: '', genre: '', picture: null, duration: null });

describe('libraryRepository', () => {
  let database: Database;

  beforeEach(async () => {
    database = await createTestDatabase();
  });

  it('saves folders, replaces one that exists and lists them by path', async () => {
    await saveFolders(database, [
      { path: '/music/b', lastModified: 1 },
      { path: '/music/a', lastModified: 1 },
    ]);
    await saveFolders(database, [{ path: '/music/b', lastModified: 2 }]);

    expect(await getFolders(database)).toEqual([
      { path: '/music/a', lastModified: 1 },
      { path: '/music/b', lastModified: 2 },
    ]);
  });

  it('finds the folders below a folder, with % and _ in the name matching themselves', async () => {
    await saveFolders(database, [
      { path: '/music/100%', lastModified: 1 },
      { path: '/music/100%/live', lastModified: 1 },
      { path: '/music/1000/live', lastModified: 1 },
    ]);

    expect((await getFoldersInside(database, '/music/100%/')).map((folder) => folder.path)).toEqual(['/music/100%/live']);
  });

  it('deletes folders and tracks by path', async () => {
    await saveFolders(database, [{ path: '/music/a', lastModified: 1 }]);
    await addTrack(database, track('/music/a/one.flac'));
    await addTrack(database, track('/music/a/two.flac'));

    await deleteFolders(database, [{ path: '/music/a' }]);
    await deleteTracks(database, [{ path: '/music/a/one.flac' }]);

    expect(await getFolders(database)).toEqual([]);
    expect((await getLibrary(database)).map((stored) => stored.path)).toEqual(['/music/a/two.flac']);
  });

  it('finds a track path only for a track of the library', async () => {
    await addTrack(database, track('/music/a/one.flac'));

    expect(await findTrackPath(database, '/music/a/one.flac')).toBe('/music/a/one.flac');
    expect(await findTrackPath(database, '/etc/passwd')).toBeUndefined();
  });
});
