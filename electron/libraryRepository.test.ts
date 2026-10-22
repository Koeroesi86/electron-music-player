import path from 'path';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Database } from 'sqlite3';
import {
  deleteFolders,
  deleteTracks,
  findTrackPath,
  getFolders,
  getAlbumPage,
  getAlbumTracks,
  getFoldersInside,
  getLibrary,
  getTrackPage,
  saveFolders,
} from './libraryRepository';
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
    const music = path.resolve('music');
    await saveFolders(database, [
      { path: path.join(music, '100%'), lastModified: 1 },
      { path: path.join(music, '100%', 'live'), lastModified: 1 },
      { path: path.join(music, '1000', 'live'), lastModified: 1 },
    ]);

    expect((await getFoldersInside(database, path.join(music, '100%'))).map((folder) => folder.path)).toEqual([path.join(music, '100%', 'live')]);
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

  describe('windows of the library', () => {
    const music = (file: string, album: string, duration = 10): Track => ({
      ...track(file),
      album,
      artist: `artist of ${file}`,
      picture: `${file}.jpg`,
      duration,
    });

    it('pages the tracks in the order of the path, with the total', async () => {
      await Promise.all(['/m/c', '/m/a', '/m/d', '/m/b', '/m/e'].map((file) => addTrack(database, track(file))));

      const page = await getTrackPage(database, 1, 2);

      expect(page.items.map((item) => item.path)).toEqual(['/m/b', '/m/c']);
      expect(page.total).toBe(5);
      expect((await getTrackPage(database, 4, 10)).items.map((item) => item.path)).toEqual(['/m/e']);
    });

    it('groups the albums by folder and title, first track first, with the values of the first track', async () => {
      await Promise.all(
        [music('/m/x/1.flac', 'Same'), music('/m/x/2.flac', 'Same', 30), music('/m/y/1.flac', 'Same'), music('/m/x/3.flac', 'Other')].map((item) =>
          addTrack(database, item)
        )
      );

      const page = await getAlbumPage(database, 0, 10);

      expect(page.total).toBe(3);
      expect(page.items.map(({ id }) => id)).toEqual(['/m/x - Same', '/m/x - Other', '/m/y - Same']);
      expect(page.items[0]).toMatchObject({ path: '/m/x', artist: 'artist of /m/x/1.flac', cover: '/m/x/1.flac.jpg', duration: 40, trackCount: 2 });
      expect((await getAlbumPage(database, 1, 1)).items.map(({ id }) => id)).toEqual(['/m/x - Other']);
    });

    it('groups the tracks of a folder with either separator, and tracks without an album under an empty title', async () => {
      await Promise.all([music('C:\\m\\1.flac', 'Win'), music('C:\\m\\2.flac', 'Win'), track('/m/none.flac')].map((item) => addTrack(database, item)));

      const page = await getAlbumPage(database, 0, 10);

      expect(page.total).toBe(2);
      expect(page.items.map(({ title, trackCount }) => [title, trackCount])).toEqual([
        ['', 1],
        ['Win', 2],
      ]);
      expect((await getAlbumTracks(database, 'C:\\m', 'Win')).map((item) => item.path)).toEqual(['C:\\m\\1.flac', 'C:\\m\\2.flac']);
      expect(await getAlbumTracks(database, '/m', '')).toHaveLength(1);
    });

    it('finds the tracks of an album by its folder and title', async () => {
      await Promise.all(
        [
          music('/m/x/2.flac', 'Same'),
          music('/m/x/1.flac', 'Same'),
          music('/m/y/1.flac', 'Same'),
          music('/m/x/sub/1.flac', 'Same'),
          music('/m/x/3.flac', 'Other'),
        ].map((item) => addTrack(database, item))
      );

      expect((await getAlbumTracks(database, '/m/x', 'Same')).map((item) => item.path)).toEqual(['/m/x/1.flac', '/m/x/2.flac']);
      expect(await getAlbumTracks(database, '/m/x', 'None')).toEqual([]);
    });
  });
});
