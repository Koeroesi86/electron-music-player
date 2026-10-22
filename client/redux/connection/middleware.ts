import type { Middleware } from 'redux';
import _ from 'lodash';
import type { Folder, Track } from '../../../types/library';
import type { RadioQuery, RadioStation, RadioTag } from '../../../types/radio';
import { electronAPI } from '../../electron-api';
import type { RootState } from '../reducers';
import { getCoverUrl } from '../../cover-url';
import { actionMiddleware, onAction } from '../on-action';
import type { Store } from '../on-action';
import type { PersistedSettings, PlaylistItem, UiState } from '../types';

type EmptyPayload = Record<string, never>;

function addListeners(store: Store) {
  electronAPI.on<{ folders: Folder[] }>('STORE_FOLDERS', (payload) => store.dispatch({ type: 'STORE_FOLDERS', payload }));
  electronAPI.on<EmptyPayload>('RESCAN_COMPLETE', (payload) => store.dispatch({ type: 'RESCAN_COMPLETE', payload }));
  electronAPI.on<{ folders: Folder[] }>('FOLDERS_ADDED_TO_LIBRARY', (payload) => store.dispatch({ type: 'FOLDERS_ADDED_TO_LIBRARY', payload }));
  electronAPI.on<EmptyPayload>('TRACKS_ADDED_TO_LIBRARY', (payload) => store.dispatch({ type: 'TRACKS_ADDED_TO_LIBRARY', payload }));
  electronAPI.on<{ maximized: boolean }>('MAXIMIZED_APP', (payload) => store.dispatch({ type: 'MAXIMIZED_APP', payload }));
  electronAPI.on<{ playlist: PlaylistItem[]; url: string }>('CLICKED_URL', (payload) => store.dispatch({ type: 'CLICKED_URL', payload }));
  electronAPI.on<{ isPlaying: boolean }>('SET_PLAYING', (payload) => store.dispatch({ type: 'SET_PLAYING', payload }));
  electronAPI.on<{ settings: Partial<PersistedSettings> }>('RESTORE_SETTINGS', (payload) => store.dispatch({ type: 'RESTORE_SETTINGS', payload }));
  electronAPI.on<{ fileName: string; progress: number; totalCount: number }>('SCANNING_FILE', (payload) => store.dispatch({ type: 'SCANNING_FILE', payload }));
  electronAPI.on<{ query: RadioQuery; stations: RadioStation[]; error?: string }>('RADIO_STATIONS', (payload) =>
    store.dispatch({ type: 'RADIO_STATIONS', payload })
  );
  electronAPI.on<{ tags: RadioTag[] }>('RADIO_TAGS_LOADED', (payload) => store.dispatch({ type: 'RADIO_TAGS_LOADED', payload }));
  electronAPI.on<{ uuid: string; title: string }>('RADIO_STREAM_TITLE', (payload) => store.dispatch({ type: 'RADIO_STREAM_TITLE', payload }));
  electronAPI.on<{ folder: string }>('SCANNING_FOLDER', (payload) => store.dispatch({ type: 'SCANNING_FOLDER', payload }));
}

function rescanLibrary(forced = false) {
  electronAPI.send('RESCAN_LIBRARY', { forced });
}

const appLoaded = _.debounce(() => {
  electronAPI.send('APP_LOADED', {});
}, 500);

const getLibrary = async (store: Store): Promise<Track[]> => {
  const { port } = store.getState().uiState;
  const response = await fetch(`http://127.0.0.1:${port}/library`);
  if (!response.ok) throw new Error(`Failed to fetch library: ${response.status}`);

  return response.json();
};

const loadLibrary = (store: Store) => getLibrary(store).then((library) => store.dispatch({ type: 'STORE_LIBRARY', payload: { library, finished: true } }));

const rescanInterval = 1000 * 60 * 60;

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

const start = (store: Store) => {
  addListeners(store);
  electronAPI.send('APP_READY', 'Ready to receive');

  setInterval(() => {
    if (store.getState().uiState.totalCount === 0) rescanLibrary(false);
  }, rescanInterval);

  loadLibrary(store).then(appLoaded);
};

const toAddedFiles = (fileList: FileList) =>
  Array.from(fileList).map((file) => ({
    name: file.name,
    path: electronAPI.getPathForFile(file),
    lastModified: file.lastModified,
  }));

const notifyTrack = (store: Store, track: Track) =>
  notifyPlaying(track, store.getState().uiState.port, () => {
    store.dispatch({ type: 'CLICK_NOTIFICATION', payload: {} });
    electronAPI.send('NOTIFICATION_CLICKED', { track });
  });

const handleActions = actionMiddleware((store) => [
  onAction('FILES_ADDED', ({ payload }) => electronAPI.send('ADD_FOLDERS_TO_LIBRARY', toAddedFiles(payload.fileList))),
  onAction('RESCAN_LIBRARY', () => rescanLibrary(true)),
  onAction('RESCAN_COMPLETE', () => loadLibrary(store)),
  onAction('CLOSE_APP', () => {
    store.dispatch({ type: 'SAVE_SETTINGS', payload: {} });
    electronAPI.send('CLOSE_APP', {});
  }),
  ...(['MINIMIZE_APP', 'MAXIMIZE_APP'] as const).map((type) => onAction(type, () => electronAPI.send(type, {}))),
  onAction('CLICKED_URL', ({ payload }) => store.dispatch({ type: 'PLAY_TRACKS', payload: { tracks: payload.playlist.map(toPlaylistTrack) } })),
  onAction('PLAY_TRACK', ({ payload }) => {
    if (payload.track) notifyTrack(store, payload.track);
  }),
  onAction('SEARCH_RADIO', ({ payload }) => electronAPI.send('RADIO_SEARCH', payload.query)),
  onAction('LOAD_RADIO_TAGS', () => electronAPI.send('RADIO_TAGS')),
  onAction('SAVE_SETTINGS', () => saveSettings(store.getState().uiState)),
]);

const middleware: Middleware<object, RootState> = (store) => {
  if (window) start(store);

  return handleActions(store);
};

export default middleware;
