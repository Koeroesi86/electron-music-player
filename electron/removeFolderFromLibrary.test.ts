import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WebContents } from 'electron';
import type { Database } from 'sqlite3';
import type { Track } from '../types/library';
import addTrack from './addTrack';
import { getFolders, getLibrary, saveFolders } from './libraryRepository';
import removeFolderFromLibrary from './removeFolderFromLibrary';
import { createTestDatabase } from './test-database';

const track = (path: string): Track => ({ path, artist: '', album: '', title: '', year: '', track: '', disk: '', genre: '', picture: null, duration: null });

describe('removeFolderFromLibrary', () => {
  let database: Database;
  const send = vi.fn();
  const sender = { send } as unknown as WebContents;
  const paths = <T extends { path: string }>(rows: T[]) => rows.map((row) => row.path);

  beforeEach(async () => {
    send.mockReset();
    database = await createTestDatabase();
    await saveFolders(
      database,
      ['/music/a', '/music/a/live', '/music/ab'].map((path) => ({ path, lastModified: 1 }))
    );
    await Promise.all(['/music/a/one.flac', '/music/a/live/two.flac', '/music/ab/three.flac'].map((path) => addTrack(database, track(path))));
  });

  it('removes the folder, the folders below it and their tracks, and reports back', async () => {
    await removeFolderFromLibrary(database, '/music/a', sender);

    expect(paths(await getFolders(database))).toEqual(['/music/ab']);
    expect(paths(await getLibrary(database))).toEqual(['/music/ab/three.flac']);
    expect(send).toHaveBeenCalledWith('STORE_FOLDERS', { folders: [{ path: '/music/ab', lastModified: 1 }] });
    expect(send).toHaveBeenCalledWith('FOLDER_REMOVED_FROM_LIBRARY', {});
  });

  it('ignores a path that is not a library folder', async () => {
    await removeFolderFromLibrary(database, '/music', sender);
    await removeFolderFromLibrary(database, 3, sender);

    expect(await getFolders(database)).toHaveLength(3);
    expect(await getLibrary(database)).toHaveLength(3);
    expect(send).not.toHaveBeenCalled();
  });
});
