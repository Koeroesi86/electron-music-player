import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyMiddleware, createStore } from 'redux';

const setup = async () => {
  const send = vi.fn();
  const on = vi.fn();
  vi.resetModules();
  vi.stubGlobal('fetch', () => Promise.reject(new Error('no server')));
  window.electronAPI = { send, on, getPathForFile: () => '', blurred: false };

  const { default: reducers } = await import('../reducers');
  const { default: middleware } = await import('./middleware');
  const store = createStore(reducers, applyMiddleware(middleware));

  const listen = (channel: string, payload: unknown) => on.mock.calls.find(([name]) => name === channel)?.[1](payload);

  return { store, send, listen };
};

describe('connection middleware', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('asks the main process for the state when it starts', async () => {
    const { send } = await setup();

    expect(send).toHaveBeenCalledWith('APP_READY', 'Ready to receive');
  });

  it('stores the launcher state the main process reports', async () => {
    const { store, listen } = await setup();

    listen('LAUNCHER_STATE', { available: true, enabled: true, offered: true });

    expect(store.getState().uiState.launcher).toEqual({ available: true, enabled: true, offered: true });
  });

  it('sends the request to add or remove the launcher to the main process', async () => {
    const { store, send } = await setup();

    store.dispatch({ type: 'SET_LAUNCHER', payload: { enabled: true } });

    expect(send).toHaveBeenCalledWith('SET_LAUNCHER', { enabled: true });
  });

  it('saves the picked language with the settings, so the main process follows it', async () => {
    const { store, send } = await setup();

    store.dispatch({ type: 'SET_LANGUAGE', payload: { language: 'hu' } });

    expect(send).toHaveBeenCalledWith('SAVE_SETTINGS', expect.objectContaining({ language: 'hu' }));
  });

  it('asks the main process for the version when it starts and stores the update state it reports', async () => {
    const { store, send, listen } = await setup();
    const state = { version: '26.10.5', electron: '40.0.0', chrome: '140.0.0', unavailable: undefined, status: { kind: 'checking' } };

    listen('UPDATE_STATE', state);

    expect(send).toHaveBeenCalledWith('GET_APP_VERSION');
    expect(store.getState().update).toEqual(state);
  });

  it('sends the request to check for updates and to open the releases to the main process', async () => {
    const { store, send } = await setup();

    store.dispatch({ type: 'CHECK_FOR_UPDATES' });
    store.dispatch({ type: 'OPEN_RELEASES' });

    expect(send).toHaveBeenCalledWith('CHECK_FOR_UPDATES');
    expect(send).toHaveBeenCalledWith('OPEN_RELEASES');
  });

  it('saves the queue and the position before the restart for an update', async () => {
    const { store, send } = await setup();
    const track = { path: '/a.flac', title: 'A', artist: '', album: '', year: '', track: '', disk: '', genre: '', picture: null, duration: 1 };
    store.dispatch({ type: 'PLAY_TRACKS', payload: { tracks: [track] } });
    store.dispatch({ type: 'SET_CURRENT_TIME', payload: { currentTime: 42 } });
    send.mockClear();

    store.dispatch({ type: 'INSTALL_UPDATE' });

    expect(send.mock.calls.map(([channel]) => channel)).toEqual(['SAVE_SETTINGS', 'INSTALL_UPDATE']);
    expect(send.mock.calls[0][1]).toMatchObject({ nowPlaying: [track], currentTime: 42 });
  });
  describe('favourites', () => {
    const station = { uuid: 'abc', name: 'Jazz FM', country: 'Hungary', tags: [], codec: 'MP3', bitrate: 128 };
    const favourite = { source: 'radio', kind: 'station', id: 'abc', snapshot: station, addedAt: 1, available: true };

    it('asks the main process for the favourites when it starts and when the library changed', async () => {
      const { store, send, listen } = await setup();
      expect(send).toHaveBeenCalledWith('FAVOURITES_LOAD');
      send.mockClear();

      listen('RESCAN_COMPLETE', {});

      expect(send).toHaveBeenCalledWith('FAVOURITES_LOAD');
      expect(store.getState().favourites).toEqual([]);
    });

    it('stores the favourites of the sources it knows and leaves out the others', async () => {
      const { store, listen } = await setup();

      listen('FAVOURITES', { favourites: [favourite, { ...favourite, source: 'drive:usb' }, 'broken'] });

      expect(store.getState().favourites).toEqual([favourite]);
    });

    it('sends the added and the removed favourite to the main process', async () => {
      const { store, send } = await setup();
      const item = { source: 'radio', kind: 'station', id: 'abc', snapshot: station } as const;

      store.dispatch({ type: 'ADD_FAVOURITE', payload: { favourite: item } });
      store.dispatch({ type: 'REMOVE_FAVOURITE', payload: { key: { source: 'radio', kind: 'station', id: 'abc' } } });

      expect(send).toHaveBeenCalledWith('FAVOURITE_ADD', item);
      expect(send).toHaveBeenCalledWith('FAVOURITE_REMOVE', { source: 'radio', kind: 'station', id: 'abc' });
      expect(store.getState().favourites).toEqual([]);
    });
  });
});
