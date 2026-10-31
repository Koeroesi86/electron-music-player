import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { copyOldUserData, getAppName } from './userData';

describe('getAppName', () => {
  it('is the product name, and a development run has a name of its own', () => {
    expect([getAppName(false), getAppName(true)]).toEqual(['eMusic', 'eMusic-dev']);
  });
});

describe('copyOldUserData', () => {
  let root: string;
  let oldFolder: string;
  let newFolder: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'emusic-user-data-'));
    oldFolder = join(root, 'electron-music-player');
    newFolder = join(root, 'eMusic');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(root, { recursive: true, force: true });
  });

  it('copies the data of the old folder, and keeps the old folder', () => {
    mkdirSync(join(oldFolder, 'Local Storage'), { recursive: true });
    writeFileSync(join(oldFolder, 'window-state.json'), '{"width":900}');
    writeFileSync(join(oldFolder, 'Local Storage', 'leveldb'), 'volume');

    expect(copyOldUserData(oldFolder, newFolder)).toBe(true);
    expect(readFileSync(join(newFolder, 'window-state.json'), 'utf8')).toBe('{"width":900}');
    expect(readFileSync(join(newFolder, 'Local Storage', 'leveldb'), 'utf8')).toBe('volume');
    expect(existsSync(join(oldFolder, 'window-state.json'))).toBe(true);
  });

  it('leaves the locks and the caches of the old folder', () => {
    mkdirSync(join(oldFolder, 'Cache'), { recursive: true });
    writeFileSync(join(oldFolder, 'Cache', 'entry'), 'x');
    symlinkSync('host-1234', join(oldFolder, 'SingletonLock'));
    writeFileSync(join(oldFolder, 'keep'), 'y');

    copyOldUserData(oldFolder, newFolder);

    expect(['keep', 'Cache', 'SingletonLock'].map((name) => existsSync(join(newFolder, name)))).toEqual([true, false, false]);
  });

  it('does not touch a folder that already exists', () => {
    mkdirSync(oldFolder);
    writeFileSync(join(oldFolder, 'window-state.json'), 'old');
    mkdirSync(newFolder);
    writeFileSync(join(newFolder, 'window-state.json'), 'new');

    expect(copyOldUserData(oldFolder, newFolder)).toBe(false);
    expect(readFileSync(join(newFolder, 'window-state.json'), 'utf8')).toBe('new');
  });

  it('does nothing on a first run', () => {
    expect(copyOldUserData(oldFolder, newFolder)).toBe(false);
    expect(existsSync(newFolder)).toBe(false);
  });

  it('ignores a copy that fails, so the app starts as on a first run', () => {
    mkdirSync(oldFolder);
    writeFileSync(oldFolder + '/file', 'x');
    writeFileSync(newFolder + '-parent', 'a file where the parent folder should be');
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(copyOldUserData(oldFolder, join(newFolder + '-parent', 'eMusic'))).toBe(false);
    expect(logged).toHaveBeenCalled();
  });
});
