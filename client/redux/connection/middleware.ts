import type { Dispatch, Middleware, MiddlewareAPI } from 'redux';
import _ from 'lodash';
import type { Folder, Track } from '../../../types/library';
import { electronAPI } from '../../electron-api';
import type { RootState } from '../reducers';
import { getCoverUrl } from '../../cover-url';
import { isAppAction } from '../types';
import type { AppAction, PersistedSettings, PlaylistItem, UiState } from '../types';

type EmptyPayload = Record<string, never>;

function addListeners(store: MiddlewareAPI<Dispatch<AppAction>, RootState>) {
  electronAPI.on<{ folders: Folder[] }>('STORE_FOLDERS', (payload) => store.dispatch({ type: 'STORE_FOLDERS', payload }));
  electronAPI.on<EmptyPayload>('RESCAN_COMPLETE', (payload) => store.dispatch({ type: 'RESCAN_COMPLETE', payload }));
  electronAPI.on<{ folders: Folder[] }>('FOLDERS_ADDED_TO_LIBRARY', (payload) => store.dispatch({ type: 'FOLDERS_ADDED_TO_LIBRARY', payload }));
  electronAPI.on<EmptyPayload>('TRACKS_ADDED_TO_LIBRARY', (payload) => store.dispatch({ type: 'TRACKS_ADDED_TO_LIBRARY', payload }));
  electronAPI.on<unknown>('LIBRARY_SIZE', (payload) => store.dispatch({ type: 'LIBRARY_SIZE', payload }));
  electronAPI.on<{ maximized: boolean }>('MAXIMIZED_APP', (payload) => store.dispatch({ type: 'MAXIMIZED_APP', payload }));
  electronAPI.on<{ playlist: PlaylistItem[]; url: string }>('CLICKED_URL', (payload) => store.dispatch({ type: 'CLICKED_URL', payload }));
  electronAPI.on<{ isPlaying: boolean }>('SET_PLAYING', (payload) => store.dispatch({ type: 'SET_PLAYING', payload }));
  electronAPI.on<{ settings: Partial<PersistedSettings> }>('RESTORE_SETTINGS', (payload) => store.dispatch({ type: 'RESTORE_SETTINGS', payload }));
  electronAPI.on<{ fileName: string; progress: number; totalCount: number }>('SCANNING_FILE', (payload) => store.dispatch({ type: 'SCANNING_FILE', payload }));
  electronAPI.on<{ folder: string }>('SCANNING_FOLDER', (payload) => store.dispatch({ type: 'SCANNING_FOLDER', payload }));
}

function rescanLibrary(forced = false) {
  electronAPI.send('RESCAN_LIBRARY', { forced });
}

const appLoaded = _.debounce(() => {
  electronAPI.send('APP_LOADED', {});
}, 500);

const getLibrary = (store: MiddlewareAPI<Dispatch<AppAction>, RootState>): Promise<Track[]> => {
  const { port } = store.getState().uiState;
  return Promise.resolve()
    .then(() => fetch(`http://127.0.0.1:${port}/library`))
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch library: ${response.status}`);
      }
      return response.json();
    });
};

const persistedKeys = [
  'view',
  'onlineView',
  'tab',
  'nowPlaying',
  'played',
  'currentSong',
  'currentTime',
  'volume',
  'selectedAlbum',
  'maximized',
  'shuffle',
  'repeat',
  'equalizer',
] satisfies (keyof PersistedSettings)[];

const saveSettings = (uiState: UiState) => electronAPI.send('SAVE_SETTINGS', _.pick(uiState, persistedKeys));

const toPlaylistTrack = ({ file, title }: PlaylistItem): Track => ({
  path: file,
  title: title ?? '',
  artist: '',
  album: '',
  year: '',
  track: '',
  disk: '',
  genre: '',
  picture: null,
  duration: 0,
});

const notifyPlaying = (track: Track, port: string, onClick: () => void) => {
  const notification: NotificationOptions & { image?: string } = {
    body: `${track.artist}\n${track.album}`,
    silent: false,
  };
  if (track.picture) {
    const url = getCoverUrl(port, track.picture);
    notification.icon = url;
    notification.image = url;
  }
  new window.Notification(track.title, notification).onclick = onClick;
};

const middleware: Middleware<object, RootState> = (store) => {
  if (window) {
    addListeners(store);
    electronAPI.send('APP_READY', 'Ready to receive');

    setInterval(
      () => {
        if (store.getState().uiState.totalCount === 0) {
          rescanLibrary(false);
        }
      },
      1000 * 60 * 60
    );

    getLibrary(store).then((library) => {
      appLoaded();
      store.dispatch({ type: 'STORE_LIBRARY', payload: { library, finished: true } });
    });
  }

  return (next) => (action) => {
    if (!isAppAction(action)) return next(action);

    switch (action.type) {
      case 'FILES_ADDED':
        electronAPI.send(
          'ADD_FOLDERS_TO_LIBRARY',
          Array.from(action.payload.fileList).map((file) => ({
            name: file.name,
            path: electronAPI.getPathForFile(file),
            lastModified: file.lastModified,
          }))
        );
        break;
      case 'RESCAN_LIBRARY':
        rescanLibrary(true);
        break;
      case 'RESCAN_COMPLETE':
        getLibrary(store).then((library) => store.dispatch({ type: 'STORE_LIBRARY', payload: { library, finished: true } }));
        break;
      case 'CLOSE_APP':
        store.dispatch({ type: 'SAVE_SETTINGS', payload: {} });
        electronAPI.send('CLOSE_APP', {});
        break;
      case 'MINIMIZE_APP':
        electronAPI.send('MINIMIZE_APP', {});
        break;
      case 'MAXIMIZE_APP':
        electronAPI.send('MAXIMIZE_APP', {});
        break;
      case 'CLICKED_URL':
        store.dispatch({ type: 'PLAY_TRACKS', payload: { tracks: action.payload.playlist.map(toPlaylistTrack) } });
        break;
      case 'PLAY_TRACK': {
        const { track } = action.payload;
        if (!track) break;

        notifyPlaying(track, store.getState().uiState.port, () => {
          store.dispatch({ type: 'CLICK_NOTIFICATION', payload: {} });
          electronAPI.send('NOTIFICATION_CLICKED', { track });
        });
        break;
      }
      case 'SAVE_SETTINGS':
        saveSettings(store.getState().uiState);
        break;
    }

    return next(action);
  };
};

export default middleware;
