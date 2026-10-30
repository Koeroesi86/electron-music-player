import { describe, expect, it } from 'vitest';
import { resolve } from 'path';
import appDataPath from './appDataPath';

describe('appDataPath', () => {
  it('keeps the folder of the app named after the package', () => {
    expect(appDataPath('/home/u/.config', 'electron-music-player', false)).toBe(resolve('/home/u/.config/electron-music-player'));
  });

  it('uses a separate folder for a dev run', () => {
    expect(appDataPath('/home/u/.config', 'electron-music-player', true)).toBe(resolve('/home/u/.config/electron-music-player-dev'));
  });

  it('puts the folder in the one that a test run names, whatever the system says', () => {
    expect(appDataPath('/home/u/.config', 'electron-music-player', false, '/tmp/run')).toBe(resolve('/tmp/run/electron-music-player'));
  });

  it('ignores a name that is empty', () => {
    expect(appDataPath('/home/u/.config', 'electron-music-player', false, '')).toBe(resolve('/home/u/.config/electron-music-player'));
  });
});
