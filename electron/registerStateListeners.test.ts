import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IpcMainEvent } from 'electron';
import type { ListenerContext } from './listenerContext';
import registerStateListeners from './registerStateListeners';

type Listener = (event: IpcMainEvent, payload?: unknown) => void;

const listeners = new Map<string, Listener>();

vi.mock('electron', () => ({
  ipcMain: { on: (channel: string, listener: Listener) => listeners.set(channel, listener) },
}));

vi.mock('./libraryRepository', () => ({ getFolders: async () => ['/music'] }));

const saveSettings = vi.fn(async () => undefined);

vi.mock('./settingsRepository', () => ({
  getSettings: async () => ({ volume: 1 }),
  saveSettings: () => saveSettings(),
}));

describe('registerStateListeners', () => {
  const context = { database: {} } as ListenerContext;
  const send = vi.fn();
  const destroyedSender = { send, isDestroyed: () => true };

  beforeEach(() => {
    listeners.clear();
    send.mockReset();
    registerStateListeners(context);
  });

  it('sends the folders and the settings to the window that is ready', async () => {
    const done = new Promise((resolve) => send.mockImplementation((channel) => channel === 'RESTORE_SETTINGS' && resolve(undefined)));

    listeners.get('APP_READY')?.({ sender: { send, isDestroyed: () => false } } as unknown as IpcMainEvent);
    await done;

    expect(send).toHaveBeenCalledWith('STORE_FOLDERS', { folders: ['/music'] });
    expect(send).toHaveBeenCalledWith('RESTORE_SETTINGS', { settings: { volume: 1 } });
  });

  it('does not send to a window that was closed while the settings were saved', async () => {
    listeners.get('SAVE_SETTINGS')?.({ sender: destroyedSender } as unknown as IpcMainEvent, {});
    await vi.waitFor(() => expect(saveSettings).toHaveBeenCalled());
    await saveSettings.mock.results[0].value;

    expect(send).not.toHaveBeenCalled();
  });
});
