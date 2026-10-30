import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { EventEmitter } from 'events';
import { createFolderWatcher, readDirectoryTimes } from './folderWatcher';

class FakeWatcher extends EventEmitter {
  close = vi.fn();
}

describe('createFolderWatcher', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /** The folders and what is below them: a number of folders each, with the modification time of the last look */
  const setup = (
    directories: Record<string, number> = { '/music': 3, '/radio': 2 },
    options: { budget?: number; checkGap?: number; checkInterval?: number } = {}
  ) => {
    const watchers = new Map<string, FakeWatcher>();
    const listeners = new Map<string, () => void>();
    const modified = new Map<string, number>();
    const watch = vi.fn((folder: string, _options: unknown, listener: () => void) => {
      const watcher = new FakeWatcher();
      watchers.set(folder, watcher);
      listeners.set(folder, listener);
      return watcher;
    }) as unknown as typeof fs.watch;
    const readTimes = vi.fn(
      async (folder: string) => new Map(Array.from({ length: directories[folder] ?? 0 }, (_, index) => [`${folder}/${index}`, modified.get(folder) ?? 1]))
    );
    const onChange = vi.fn();
    const folderWatcher = createFolderWatcher(onChange, { watch, readTimes, checkInterval: 1000, checkGap: 0, ...options });
    return { folderWatcher, watch, watchers, listeners, modified, readTimes, onChange };
  };

  it('watches the folders recursively, and reports the folder that changed', async () => {
    const { folderWatcher, watch, listeners, onChange } = setup();
    await folderWatcher.update(['/music', '/radio']);

    listeners.get('/radio')?.();

    expect(watch).toHaveBeenCalledWith('/music', { recursive: true }, expect.any(Function));
    expect(onChange).toHaveBeenCalledExactlyOnceWith('/radio');
    folderWatcher.close();
  });

  it('opens what is new and closes what is gone, and leaves the rest alone', async () => {
    const { folderWatcher, watch, watchers } = setup({ '/music': 1, '/radio': 1, '/usb': 1 });
    await folderWatcher.update(['/music', '/radio']);
    await folderWatcher.update(['/radio', '/usb']);

    expect(watchers.get('/music')?.close).toHaveBeenCalled();
    expect(watchers.get('/radio')?.close).not.toHaveBeenCalled();
    expect(watch).toHaveBeenCalledTimes(3);
    folderWatcher.close();
  });

  it('does not watch what does not fit the budget, and looks at it instead', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { folderWatcher, watch, modified, onChange } = setup({ '/music': 3, '/radio': 4 }, { budget: 5 });
    await folderWatcher.update(['/music', '/radio']);

    expect(watch).toHaveBeenCalledExactlyOnceWith('/music', { recursive: true }, expect.any(Function));

    modified.set('/radio', 2);
    await vi.advanceTimersByTimeAsync(1000);
    expect(onChange).toHaveBeenCalledExactlyOnceWith('/radio');
    folderWatcher.close();
  });

  it('reports a folder whose folders changed at a look, and only once', async () => {
    const { folderWatcher, modified, onChange } = setup();
    await folderWatcher.update(['/music']);

    await vi.advanceTimersByTimeAsync(1000);
    expect(onChange).not.toHaveBeenCalled();

    modified.set('/music', 2);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(1000);
    expect(onChange).toHaveBeenCalledExactlyOnceWith('/music');
    folderWatcher.close();
  });

  it('does not report at the look what the watch has reported', async () => {
    const { folderWatcher, listeners, modified, onChange } = setup();
    await folderWatcher.update(['/music']);

    modified.set('/music', 2);
    listeners.get('/music')?.();
    await vi.advanceTimersByTimeAsync(1000);

    expect(onChange).toHaveBeenCalledExactlyOnceWith('/music');
    folderWatcher.close();
  });

  it('does not look again within the gap that was set', async () => {
    const { folderWatcher, readTimes } = setup({ '/music': 3 }, { checkGap: 30_000, checkInterval: 600_000 });
    await folderWatcher.update(['/music']);
    readTimes.mockClear();

    await folderWatcher.check();
    await folderWatcher.check();
    await vi.advanceTimersByTimeAsync(30_000);
    await folderWatcher.check();

    expect(readTimes).toHaveBeenCalledTimes(2);
    folderWatcher.close();
  });

  it('goes on looking at a folder whose watch reported an error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { folderWatcher, watchers, modified, onChange } = setup();
    await folderWatcher.update(['/music']);

    watchers.get('/music')?.emit('error', new Error('ENOSPC'));
    expect(watchers.get('/music')?.close).toHaveBeenCalled();

    modified.set('/music', 2);
    await vi.advanceTimersByTimeAsync(1000);
    expect(onChange).toHaveBeenCalledExactlyOnceWith('/music');
    folderWatcher.close();
  });

  it('looks at a folder that cannot be watched, and does not throw', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const watch = vi.fn(() => {
      throw new Error('ENOSPC');
    }) as unknown as typeof fs.watch;
    const modified = new Map([['/music', 1]]);
    const readTimes = vi.fn(async (folder: string) => new Map([[`${folder}/0`, modified.get(folder) ?? 1]]));
    const onChange = vi.fn();
    const folderWatcher = createFolderWatcher(onChange, { watch, readTimes, checkInterval: 1000, checkGap: 0 });

    await folderWatcher.update(['/music']);
    modified.set('/music', 2);
    await vi.advanceTimersByTimeAsync(1000);

    expect(onChange).toHaveBeenCalledExactlyOnceWith('/music');
    folderWatcher.close();
  });

  it('tries a folder that did not answer again with the next update', async () => {
    const { folderWatcher, watch } = setup({ '/music': 0 });
    await folderWatcher.update(['/music']);

    expect(watch).not.toHaveBeenCalled();
    folderWatcher.close();
  });

  it('closes every watch and stops looking', async () => {
    const { folderWatcher, watchers, readTimes } = setup();
    await folderWatcher.update(['/music', '/radio']);
    folderWatcher.close();
    readTimes.mockClear();
    await vi.advanceTimersByTimeAsync(5000);

    expect([...watchers.values()].map((watcher) => watcher.close.mock.calls.length)).toEqual([1, 1]);
    expect(readTimes).not.toHaveBeenCalled();
  });

  it('stops looking when no folder is left', async () => {
    const { folderWatcher, readTimes } = setup();
    await folderWatcher.update(['/music']);
    await folderWatcher.update([]);
    readTimes.mockClear();
    await vi.advanceTimersByTimeAsync(5000);

    expect(readTimes).not.toHaveBeenCalled();
  });
});

describe('with the file system', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'emusic-watch-'));
    fs.mkdirSync(path.join(root, 'artist', 'album'), { recursive: true });
  });

  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it('reads the folder and the folders below it, and not the files', async () => {
    fs.writeFileSync(path.join(root, 'artist', 'album', 'one.flac'), '');

    expect([...(await readDirectoryTimes(root)).keys()].sort()).toEqual([root, path.join(root, 'artist'), path.join(root, 'artist', 'album')]);
  });

  it('finds a new file by the modification time of its folder', async () => {
    const album = path.join(root, 'artist', 'album');
    fs.utimesSync(album, 1, 1);
    const before = await readDirectoryTimes(root);
    fs.writeFileSync(path.join(album, 'new.flac'), '');

    expect((await readDirectoryTimes(root)).get(album)).not.toBe(before.get(album));
  });

  it('reads nothing of a folder that is not there', async () => {
    expect((await readDirectoryTimes(path.join(root, 'gone'))).size).toBe(0);
  });

  it('sees a file that is added below the folder', async () => {
    const onChange = vi.fn();
    const folderWatcher = createFolderWatcher(onChange);
    await folderWatcher.update([root]);

    // the watch needs a moment to be in place on some systems, so the file is written until it is seen
    await vi.waitFor(() => {
      fs.writeFileSync(path.join(root, 'artist', 'album', `${Date.now()}.flac`), '');
      expect(onChange).toHaveBeenCalledWith(root);
    });

    folderWatcher.close();
  });
});
