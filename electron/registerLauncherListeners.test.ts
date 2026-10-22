import { mkdtemp, readFile, rm, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IpcMainEvent } from 'electron';
import type { LauncherOptions } from './appImageLauncher';

type Listener = (event: IpcMainEvent, payload?: unknown) => void;

const listeners = new Map<string, Listener>();
let home: string;

vi.mock('electron', () => ({
  app: { getPath: (name: string) => join(home, name) },
  ipcMain: { on: (channel: string, listener: Listener) => listeners.set(channel, listener) },
}));

// the listeners find the icons relative to the compiled files, the sources have them one folder up
vi.mock('./appImageLauncher', async (importOriginal) => {
  const original = await importOriginal<typeof import('./appImageLauncher')>();
  return {
    ...original,
    enableLauncher: (appImage: string, options: LauncherOptions) =>
      original.enableLauncher(appImage, { ...options, iconsPath: resolve(__dirname, '../icons/png') }),
  };
});

const registerLauncherListeners = async () => (await import('./registerLauncherListeners')).default;

describe('registerLauncherListeners', () => {
  const send = vi.fn();
  const event = { sender: { send } } as unknown as IpcMainEvent;
  const appImage = () => join(home, 'Apps/eMusic.AppImage');
  const desktopFile = () => join(home, 'data/applications/emusic.desktop');
  const lastState = () => new Promise((resolve) => send.mockImplementation((_channel, state) => resolve(state)));

  beforeEach(async () => {
    home = await mkdtemp(join(tmpdir(), 'emusic-listeners-'));
    vi.stubEnv('XDG_DATA_HOME', join(home, 'data'));
    listeners.clear();
    send.mockReset();
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(home, { recursive: true, force: true });
  });

  it('listens to nothing outside an AppImage', async () => {
    (await registerLauncherListeners())(undefined, undefined);

    expect(listeners.size).toBe(0);
  });

  it('reports that the user was not asked yet on the first run', async () => {
    (await registerLauncherListeners())(undefined, appImage());
    const state = lastState();

    listeners.get('APP_READY')?.(event);

    await expect(state).resolves.toEqual({ available: true, enabled: false, offered: false });
  });

  it('adds the app to the menu when the user agrees, and remembers it was asked', async () => {
    (await registerLauncherListeners())(undefined, appImage());
    const state = lastState();

    listeners.get('SET_LAUNCHER')?.(event, { enabled: true });

    await expect(state).resolves.toEqual({ available: true, enabled: true, offered: true });
    await expect(readFile(desktopFile(), 'utf8')).resolves.toContain(`Exec="${appImage()}"`);
  });

  it('remembers it was asked when the user declines, and adds nothing', async () => {
    (await registerLauncherListeners())(undefined, appImage());
    const state = lastState();

    listeners.get('SET_LAUNCHER')?.(event, { enabled: false });

    await expect(state).resolves.toEqual({ available: true, enabled: false, offered: true });
    await expect(stat(desktopFile())).rejects.toThrow();
  });

  it.each([undefined, 'yes', {}, { enabled: 'yes' }])('ignores the request %j', async (payload) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    (await registerLauncherListeners())(undefined, appImage());

    listeners.get('SET_LAUNCHER')?.(event, payload);

    await expect(stat(join(home, 'userData/launcher-offered'))).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  });
});
