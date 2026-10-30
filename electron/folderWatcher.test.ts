import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { EventEmitter } from 'events';
import { createFolderWatcher } from './folderWatcher';

class FakeWatcher extends EventEmitter {
  close = vi.fn();
}

describe('createFolderWatcher', () => {
  afterEach(() => vi.restoreAllMocks());

  const fake = () => {
    const watchers = new Map<string, FakeWatcher>();
    const listeners = new Map<string, () => void>();
    const watch = vi.fn((folder: string, _options: unknown, listener: () => void) => {
      const watcher = new FakeWatcher();
      watchers.set(folder, watcher);
      listeners.set(folder, listener);
      return watcher;
    }) as unknown as typeof fs.watch;
    return { watch, watchers, listeners };
  };

  it('watches the folders recursively, and reports the folder that changed', () => {
    const { watch, listeners } = fake();
    const onChange = vi.fn();
    createFolderWatcher(onChange, watch).update(['/music', '/radio']);

    listeners.get('/radio')?.();

    expect(watch).toHaveBeenCalledWith('/music', { recursive: true }, expect.any(Function));
    expect(onChange).toHaveBeenCalledExactlyOnceWith('/radio');
  });

  it('opens what is new and closes what is gone, and leaves the rest alone', () => {
    const { watch, watchers } = fake();
    const folderWatcher = createFolderWatcher(vi.fn(), watch);
    folderWatcher.update(['/music', '/radio']);
    folderWatcher.update(['/radio', '/usb']);

    expect(watchers.get('/music')?.close).toHaveBeenCalled();
    expect(watchers.get('/radio')?.close).not.toHaveBeenCalled();
    expect(watch).toHaveBeenCalledTimes(3);
  });

  it('closes everything', () => {
    const { watch, watchers } = fake();
    const folderWatcher = createFolderWatcher(vi.fn(), watch);
    folderWatcher.update(['/music', '/radio']);
    folderWatcher.close();

    expect([...watchers.values()].map((watcher) => watcher.close.mock.calls.length)).toEqual([1, 1]);
  });

  it('stops watching a folder that reports an error, and watches it again when asked', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { watch, watchers } = fake();
    const folderWatcher = createFolderWatcher(vi.fn(), watch);
    folderWatcher.update(['/usb']);

    watchers.get('/usb')?.emit('error', new Error('ENOSPC'));
    expect(watchers.get('/usb')?.close).toHaveBeenCalled();

    folderWatcher.update(['/usb']);
    expect(watch).toHaveBeenCalledTimes(2);
  });

  it('does not throw for a folder that cannot be watched', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const watch = vi.fn(() => {
      throw new Error('ENOENT');
    }) as unknown as typeof fs.watch;

    expect(() => createFolderWatcher(vi.fn(), watch).update(['/gone'])).not.toThrow();
  });

  it('sees a file that is added below the folder', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'emusic-watch-'));
    fs.mkdirSync(path.join(root, 'album'));
    const onChange = vi.fn();
    const folderWatcher = createFolderWatcher(onChange);
    folderWatcher.update([root]);

    // the watch needs a moment to be in place on some systems, so the file is written until it is seen
    await vi.waitFor(() => {
      fs.writeFileSync(path.join(root, 'album', `${Date.now()}.flac`), '');
      expect(onChange).toHaveBeenCalledWith(root);
    });

    folderWatcher.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
});
