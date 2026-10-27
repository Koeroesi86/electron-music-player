import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyMiddleware, createStore } from 'redux';

const setup = async (fetchImpl: (url: string) => Promise<unknown> = () => Promise.reject(new Error('no server'))) => {
  const send = vi.fn();
  const on = vi.fn();
  vi.resetModules();
  const fetchMock = vi.fn(fetchImpl);
  vi.stubGlobal('fetch', fetchMock);
  window.electronAPI = { send, on, getPathForFile: () => '', blurred: false };

  const { default: reducers } = await import('../reducers');
  const { default: middleware } = await import('./middleware');
  const store = createStore(reducers, applyMiddleware(middleware));

  const listen = (channel: string, payload: unknown) => on.mock.calls.find(([name]) => name === channel)?.[1](payload);

  return { store, send, listen, fetchMock };
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

  it('saves the picked mode at once with the settings, so the main process matches its native parts to it', async () => {
    const { store, send } = await setup();

    store.dispatch({ type: 'SET_THEME_MODE', payload: { mode: 'light' } });

    expect(send).toHaveBeenCalledWith('SAVE_SETTINGS', expect.objectContaining({ theme: { mode: 'light', accent: undefined } }));
  });

  it('saves the accent once the colour input stops changing, with the last colour', async () => {
    vi.useFakeTimers();
    try {
      const { store, send } = await setup();

      store.dispatch({ type: 'SET_ACCENT', payload: { accent: '#111111' } });
      store.dispatch({ type: 'SET_ACCENT', payload: { accent: '#222222' } });
      expect(send).not.toHaveBeenCalledWith('SAVE_SETTINGS', expect.anything());

      vi.advanceTimersByTime(500);

      expect(send.mock.calls.filter(([channel]) => channel === 'SAVE_SETTINGS')).toEqual([
        ['SAVE_SETTINGS', expect.objectContaining({ theme: { mode: 'system', accent: '#222222' } })],
      ]);
    } finally {
      vi.useRealTimers();
    }
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

  describe('history', () => {
    const station = { uuid: 'abc', name: 'Jazz FM', country: 'Hungary', tags: [], codec: 'MP3', bitrate: 128 };
    const track = { path: '/a.flac', title: 'A', artist: '', album: '', year: '', track: '', disk: '', genre: '', picture: null, duration: 1 };
    const item = { source: 'radio', kind: 'station', id: 'abc', snapshot: station, playedAt: 1, available: true };

    it('asks the main process for the history when it starts and when the library changed', async () => {
      const { send, listen } = await setup();
      expect(send).toHaveBeenCalledWith('HISTORY_LOAD');
      send.mockClear();

      listen('RESCAN_COMPLETE', {});

      expect(send).toHaveBeenCalledWith('HISTORY_LOAD');
    });

    it('stores the history of the sources it knows and leaves out the others', async () => {
      const { store, listen } = await setup();

      listen('HISTORY', { history: [item, { ...item, source: 'drive:usb' }, 'broken'] });

      expect(store.getState().history).toEqual([item]);
    });

    it('records a track of the library when it starts playing', async () => {
      const { store, send } = await setup();
      vi.stubGlobal('Notification', vi.fn());

      store.dispatch({ type: 'PLAY_TRACK', payload: { track } });

      expect(send).toHaveBeenCalledWith('HISTORY_RECORD', { source: 'local', kind: 'track', id: '/a.flac', snapshot: track });
    });

    it('records the station a radio track plays, not the track', async () => {
      const { store, send } = await setup();

      store.dispatch({ type: 'PLAY_RADIO_STATION', payload: { station } });

      expect(send).toHaveBeenCalledWith('HISTORY_RECORD', { source: 'radio', kind: 'station', id: 'abc', snapshot: station });
    });

    it('records nothing when playback is cleared', async () => {
      const { store, send } = await setup();
      send.mockClear();

      store.dispatch({ type: 'PLAY_TRACK', payload: { track: null } });

      expect(send).not.toHaveBeenCalledWith('HISTORY_RECORD', expect.anything());
    });

    it('clears the history in the store and in the main process', async () => {
      const { store, send, listen } = await setup();
      listen('HISTORY', { history: [item] });

      store.dispatch({ type: 'CLEAR_HISTORY' });

      expect(send).toHaveBeenCalledWith('HISTORY_CLEAR');
      expect(store.getState().history).toEqual([]);
    });
  });

  describe('the sort and the folders of the library', () => {
    const emptyPage = () => Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [], total: 0 }) });
    const requested = (fetchMock: ReturnType<typeof vi.fn>) => fetchMock.mock.calls.map(([url]) => String(url));
    const folder = (path: string) => ({ path, lastModified: 1 });

    it('saves the sort and the selected folders with the settings', async () => {
      const { store, send } = await setup();

      store.dispatch({ type: 'SET_TRACK_SORT', payload: { sort: { field: 'year', direction: 'desc' } } });
      store.dispatch({ type: 'SET_ALBUM_SORT', payload: { sort: { field: 'title', direction: 'asc' } } });
      store.dispatch({ type: 'SET_LIBRARY_FOLDERS', payload: { folders: ['/m'] } });
      store.dispatch({ type: 'SAVE_SETTINGS', payload: {} });

      expect(send).toHaveBeenLastCalledWith(
        'SAVE_SETTINGS',
        expect.objectContaining({
          trackSort: { field: 'year', direction: 'desc' },
          albumSort: { field: 'title', direction: 'asc' },
          libraryFolders: ['/m'],
        })
      );
    });

    it('drops the pages of the list whose sort changed, and fetches the first page sorted', async () => {
      const { store, fetchMock } = await setup(emptyPage);
      store.dispatch({ type: 'STORE_TRACK_PAGE', payload: { page: 0, items: [], total: 500 } });
      store.dispatch({ type: 'STORE_ALBUM_PAGE', payload: { page: 0, items: [], total: 5 } });

      store.dispatch({ type: 'SET_TRACK_SORT', payload: { sort: { field: 'title', direction: 'desc' } } });

      expect(store.getState().library.tracks).toEqual({ total: undefined, pages: {}, stale: [] });
      expect(store.getState().library.albums.total).toBe(5);
      store.dispatch({ type: 'LOAD_LIBRARY_PAGE', payload: { kind: 'tracks', page: 0 } });
      await vi.waitFor(() => expect(requested(fetchMock)).toContain('http://127.0.0.1:3000/library/tracks?offset=0&limit=100&sort=title&dir=desc'));
    });

    it('drops the albums when their sort changes, and not the tracks', async () => {
      const { store } = await setup(emptyPage);
      store.dispatch({ type: 'STORE_TRACK_PAGE', payload: { page: 0, items: [], total: 500 } });
      store.dispatch({ type: 'STORE_ALBUM_PAGE', payload: { page: 0, items: [], total: 5 } });

      store.dispatch({ type: 'SET_ALBUM_SORT', payload: { sort: { field: 'year', direction: 'asc' } } });

      expect(store.getState().library.albums.total).toBeUndefined();
      expect(store.getState().library.tracks.total).toBe(500);
    });

    it('keeps the pages when the sort is set to what it was', async () => {
      const { store } = await setup(emptyPage);
      store.dispatch({ type: 'STORE_TRACK_PAGE', payload: { page: 0, items: [], total: 500 } });

      store.dispatch({ type: 'SET_TRACK_SORT', payload: { sort: undefined } });

      expect(store.getState().library.tracks.total).toBe(500);
    });

    it('does not store a page that was asked for before the sort changed, and asks for it again with the new sort', async () => {
      const resolvers: (() => void)[] = [];
      const { store, fetchMock } = await setup(
        () =>
          new Promise((resolve) => {
            resolvers.push(() => resolve({ ok: true, json: () => Promise.resolve({ items: [], total: 7 }) }));
          })
      );
      await vi.waitFor(() => expect(resolvers).toHaveLength(1));

      store.dispatch({ type: 'SET_TRACK_SORT', payload: { sort: { field: 'artist', direction: 'asc' } } });
      resolvers[0]();

      await vi.waitFor(() => expect(requested(fetchMock)).toContain('http://127.0.0.1:3000/library/tracks?offset=0&limit=100&sort=artist&dir=asc'));
      expect(store.getState().library.tracks.total).toBeUndefined();
    });

    it('limits the lists to the selected folders the library has, and ignores a stale one', async () => {
      const { store, listen, fetchMock } = await setup(emptyPage);
      store.dispatch({ type: 'STORE_TRACK_PAGE', payload: { page: 0, items: [], total: 500 } });
      store.dispatch({ type: 'RESTORE_SETTINGS', payload: { settings: { libraryFolders: ['/m/a', '/gone'] } } });

      // the folders arrive after the settings, and the selection is only of the folder that exists
      listen('STORE_FOLDERS', { folders: [folder('/m/a'), folder('/m/b')] });
      expect(store.getState().library.tracks.total).toBeUndefined();
      expect(store.getState().uiState.libraryFolders).toEqual(['/m/a']);
      store.dispatch({ type: 'LOAD_LIBRARY_PAGE', payload: { kind: 'albums', page: 0 } });

      await vi.waitFor(() => expect(requested(fetchMock)).toContain('http://127.0.0.1:3000/library/albums?offset=0&limit=100&folder=%2Fm%2Fa'));
    });

    it('shows everything again when the only selected folder leaves the library', async () => {
      const { store, listen } = await setup(emptyPage);
      listen('STORE_FOLDERS', { folders: [folder('/m/a'), folder('/m/b')] });
      store.dispatch({ type: 'SET_LIBRARY_FOLDERS', payload: { folders: ['/m/a'] } });
      store.dispatch({ type: 'STORE_TRACK_PAGE', payload: { page: 0, items: [], total: 2 } });

      listen('STORE_FOLDERS', { folders: [folder('/m/b')] });

      expect(store.getState().uiState.libraryFolders).toEqual([]);
      expect(store.getState().library.tracks.total).toBeUndefined();
    });
  });
});
