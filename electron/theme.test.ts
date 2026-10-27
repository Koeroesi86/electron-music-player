import { beforeEach, describe, expect, it, vi } from 'vitest';

const nativeTheme = vi.hoisted(() => ({ themeSource: 'system', shouldUseDarkColors: true }));

vi.mock('electron', () => ({ nativeTheme }));

import { applyThemeMode, isDarkTheme, themeModeOf } from './theme';

describe('main process theme', () => {
  beforeEach(() => {
    nativeTheme.themeSource = 'system';
    nativeTheme.shouldUseDarkColors = true;
  });

  it.each([
    [{ theme: { mode: 'light' } }, 'light'],
    [{ theme: { mode: 'dark', accent: '#5aa9ff' } }, 'dark'],
    [{ theme: { mode: 'system' } }, 'system'],
    [{ theme: { mode: 'sepia' } }, 'system'],
    [{ theme: { accent: '#5aa9ff' } }, 'system'],
    [{ theme: 'dark' }, 'system'],
    [{ theme: null }, 'system'],
    [{}, 'system'],
    [null, 'system'],
    [undefined, 'system'],
    ['dark', 'system'],
  ])('reads the mode of %j as %s', (settings, expected) => {
    expect(themeModeOf(settings)).toBe(expected);
  });

  it('sets the native theme to the saved mode, and back to the system one when it is gone', () => {
    applyThemeMode({ theme: { mode: 'light' } });
    expect(nativeTheme.themeSource).toBe('light');

    applyThemeMode({ theme: { mode: 'dark' } });
    expect(nativeTheme.themeSource).toBe('dark');

    applyThemeMode({});
    expect(nativeTheme.themeSource).toBe('system');
  });

  it('tells whether the window is dark', () => {
    expect(isDarkTheme()).toBe(true);

    nativeTheme.shouldUseDarkColors = false;
    expect(isDarkTheme()).toBe(false);
  });
});
