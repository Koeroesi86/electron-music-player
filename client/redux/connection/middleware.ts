import type { Middleware } from 'redux';
import type { Folder, Track } from '../../../types/library';
import type { RadioQuery, RadioStation, RadioTag } from '../../../types/radio';
import type { UpdateState } from '../../../types/update';
import { electronAPI } from '../../electron-api';
import { debounce } from '../../utils/debounce';
import type { RootState } from '../reducers';
import toAddedFiles from '../../added-files';
import { getCoverUrl } from '../../cover-url';
import { isFavourite, stationFavourite, trackFavourite } from '../../favourites';
import { isHistoryItem } from '../../history';
import { radioUuidOf } from '../../radio-track';
import { fetchAlbumPage, fetchTrackPage } from '../../library-api';
import { actionMiddleware, onAction } from '../on-action';
import type { Store } from '../on-action';
import type { PersistedSettings, PlaylistItem, UiState } from '../types';

type EmptyPayload = Record<string, never>;

function addListeners(store: Store) {
  electronAPI.on<{ folders: Folder[] }>('STORE_FOLDERS', (payload) => store.dispatch({ type: 'STORE_FOLDERS', payload }));
  electronAPI.on<{ folders: string[] }>('OFFLINE_FOLDERS', (payload) => store.dispatch({ type: 'OFFLINE_FOLDERS', payload }));
  electronAPI.on<EmptyPayload>('RESCAN_COMPLETE', (payload) => store.dispatch({ type: 'RESCAN_COMPLETE', payload }));
  electronAPI.on<{ folders: Folder[] }>('FOLDERS_ADDED_TO_LIBRARY', (payload) => store.dispatch({ type: 'FOLDERS_ADDED_TO_LIBRARY', payload }));
  electronAPI.on<EmptyPayload>('FOLDER_REMOVED_FROM_LIBRARY', (payload) => store.dispatch({ type: 'FOLDER_REMOVED_FROM_LIBRARY', payload }));
  electronAPI.on<EmptyPayload>('TRACKS_ADDED_TO_LIBRARY', (payload) => store.dispatch({ type: 'TRACKS_ADDED_TO_LIBRARY', payload }));
  electronAPI.on<{ maximized: boolean }>('MAXIMIZED_APP', (payload) => store.dispatch({ type: 'MAXIMIZED_APP', payload }));
  electronAPI.on<{ playlist: PlaylistItem[]; url: string }>('CLICKED_URL', (payload) => store.dispatch({ type: 'CLICKED_URL', payload }));
  electronAPI.on<{ isPlaying: boolean }>('SET_PLAYING', (payload) => store.dispatch({ type: 'SET_PLAYING', payload }));
  electronAPI.on<{ available: boolean; enabled: boolean; offered: boolean }>('LAUNCHER_STATE', (payload) =>
    store.dispatch({ type: 'LAUNCHER_STATE', payload })
  );
  electronAPI.on<UpdateState>('UPDATE_STATE', (payload) => store.dispatch({ type: 'UPDATE_STATE', payload }));
  electronAPI.on<{ settings: Partial<PersistedSettings> }>('RESTORE_SETTINGS', (payload) => store.dispatch({ type: 'RESTORE_SETTINGS', payload }));
  electronAPI.on<{ fileName: string; progress: number; totalCount: number }>('SCANNING_FILE', (payload) => store.dispatch({ type: 'SCANNING_FILE', payload }));
  electronAPI.on<{ query: RadioQuery; stations: RadioStation[]; error?: string }>('RADIO_STATIONS', (payload) =>
    store.dispatch({ type: 'RADIO_STATIONS', payload })
  );
  electronAPI.on<{ tags: RadioTag[] }>('RADIO_TAGS_LOADED', (payload) => store.dispatch({ type: 'RADIO_TAGS_LOADED', payload }));
  electronAPI.on<{ uuid: string; title: string }>('RADIO_STREAM_TITLE', (payload) => store.dispatch({ type: 'RADIO_STREAM_TITLE', payload }));
  electronAPI.on<{ uuid: string; title: string; art: string }>('RADIO_STREAM_ART', (payload) => store.dispatch({ type: 'RADIO_STREAM_ART', payload }));
  // a favourite of a source this version does not know is left out
  electronAPI.on<{ favourites: unknown[] }>('FAVOURITES', ({ favourites }) =>
    store.dispatch({ type: 'FAVOURITES_LOADED', payload: { favourites: favourites.filter(isFavourite) } })
  );
  electronAPI.on<{ history: unknown[] }>('HISTORY', ({ history }) =>
    store.dispatch({ type: 'HISTORY_LOADED', payload: { history: history.filter(isHistoryItem) } })
  );
  electronAPI.on<{ folder: string }>('SCANNING_FOLDER', (payload) => store.dispatch({ type: 'SCANNING_FOLDER', payload }));
}

function rescanLibrary(forced = false) {
  electronAPI.send('RESCAN_LIBRARY', { forced });
}

const appLoaded = debounce(() => {
  electronAPI.send('APP_LOADED', {});
}, 500);

const pageFetchers = {
  tracks: (port: string, page: number) => fetchTrackPage(port, page).then((result) => ({ type: 'STORE_TRACK_PAGE' as const, payload: { page, ...result } })),
  albums: (port: string, page: number) => fetchAlbumPage(port, page).then((result) => ({ type: 'STORE_ALBUM_PAGE' as const, payload: { page, ...result } })),
};

const loading = new Set<string>();
let generation = 0;

/** Fetch a page once at a time; a page that was requested before the library changed is fetched again instead of stored */
const loadPage = (store: Store, kind: keyof typeof pageFetchers, page: number): Promise<void> => {
  const key = `${kind}:${page}`;
  if (loading.has(key)) return Promise.resolve();

  loading.add(key);
  const requested = generation;
  return pageFetchers[kind](store.getState().uiState.port, page)
    .then((action) => {
      loading.delete(key);
      if (requested === generation) store.dispatch(action);
      else store.dispatch({ type: 'LOAD_LIBRARY_PAGE', payload: { kind, page } });
    })
    .catch((err) => {
      loading.delete(key);
      console.error(err);
    });
};

const rescanInterval = 1000 * 60 * 60;
// a drive that is not there is looked for again at this pace, besides every time the window gets the focus
const offlineRecheckInterval = 1000 * 30;

const persistedKeys = [
  'view',
  'onlineView',
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
  'desktopBlur',
  'language',
  'theme',
] satisfies (keyof PersistedSettings)[];

const saveSettings = (uiState: UiState) => electronAPI.send('SAVE_SETTINGS', Object.fromEntries(persistedKeys.map((key) => [key, uiState[key]])));

const saveAccent = debounce((store: Store) => saveSettings(store.getState().uiState), 500);

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
  electronAPI.send('GET_APP_VERSION');
  electronAPI.send('FAVOURITES_LOAD');
  electronAPI.send('HISTORY_LOAD');

  setInterval(() => {
    if (store.getState().uiState.totalCount === 0) rescanLibrary(false);
  }, rescanInterval);

  electronAPI.send('CHECK_FOLDERS');
  window.addEventListener('focus', () => electronAPI.send('CHECK_FOLDERS'));
  setInterval(() => {
    if (store.getState().offlineFolders.length > 0) electronAPI.send('CHECK_FOLDERS');
  }, offlineRecheckInterval);

  loadPage(store, 'tracks', 0).then(appLoaded);
};

const notifyTrack = (store: Store, track: Track) =>
  notifyPlaying(track, store.getState().uiState.port, () => {
    store.dispatch({ type: 'CLICK_NOTIFICATION', payload: {} });
    electronAPI.send('NOTIFICATION_CLICKED', { track });
  });

const handleActions = actionMiddleware((store) => [
  onAction('FILES_ADDED', ({ payload }) => electronAPI.send('ADD_FOLDERS_TO_LIBRARY', toAddedFiles(Array.from(payload.fileList), electronAPI.getPathForFile))),
  onAction('PICK_FOLDERS', () => electronAPI.send('PICK_FOLDERS')),
  onAction('REMOVE_FOLDER', ({ payload }) => electronAPI.send('REMOVE_FOLDER_FROM_LIBRARY', payload.path)),
  onAction('RESCAN_LIBRARY', () => rescanLibrary(true)),
  onAction('LOAD_LIBRARY_PAGE', ({ payload }) => void loadPage(store, payload.kind, payload.page)),
  // the cached pages are fetched again when they are shown, not all at once
  ...(['RESCAN_COMPLETE', 'TRACKS_ADDED_TO_LIBRARY', 'FOLDER_REMOVED_FROM_LIBRARY'] as const).map((type) =>
    onAction(type, () => {
      generation += 1;
      store.dispatch({ type: 'INVALIDATE_LIBRARY' });
      // what the library has decides which local favourites are available
      store.dispatch({ type: 'LOAD_FAVOURITES' });
      store.dispatch({ type: 'LOAD_HISTORY' });
    })
  ),
  onAction('CLOSE_APP', () => {
    store.dispatch({ type: 'SAVE_SETTINGS', payload: {} });
    electronAPI.send('CLOSE_APP', {});
  }),
  ...(['MINIMIZE_APP', 'MAXIMIZE_APP'] as const).map((type) => onAction(type, () => electronAPI.send(type, {}))),
  onAction('CLICKED_URL', ({ payload }) => store.dispatch({ type: 'PLAY_TRACKS', payload: { tracks: payload.playlist.map(toPlaylistTrack) } })),
  onAction('PLAY_TRACK', ({ payload }) => {
    if (!payload.track) return;

    notifyTrack(store, payload.track);
    // a station is recorded with all that is known of it when it is picked, the track of the radio knows its name only
    if (!radioUuidOf(payload.track.path)) electronAPI.send('HISTORY_RECORD', trackFavourite(payload.track));
  }),
  onAction('PLAY_RADIO_STATION', ({ payload }) => electronAPI.send('HISTORY_RECORD', stationFavourite(payload.station))),
  onAction('LOAD_FAVOURITES', () => electronAPI.send('FAVOURITES_LOAD')),
  onAction('LOAD_HISTORY', () => electronAPI.send('HISTORY_LOAD')),
  onAction('CLEAR_HISTORY', () => electronAPI.send('HISTORY_CLEAR')),
  onAction('ADD_FAVOURITE', ({ payload }) => electronAPI.send('FAVOURITE_ADD', payload.favourite)),
  onAction('REMOVE_FAVOURITE', ({ payload }) => electronAPI.send('FAVOURITE_REMOVE', payload.key)),
  onAction('SEARCH_RADIO', ({ payload }) => electronAPI.send('RADIO_SEARCH', payload.query)),
  onAction('LOAD_RADIO_TAGS', () => electronAPI.send('RADIO_TAGS')),
  onAction('CHECK_FOR_UPDATES', () => electronAPI.send('CHECK_FOR_UPDATES')),
  onAction('OPEN_RELEASES', () => electronAPI.send('OPEN_RELEASES')),
  // the restart quits the app, so the queue and the position are saved first (the main process closes the database after what it has queued)
  onAction('INSTALL_UPDATE', () => {
    saveSettings(store.getState().uiState);
    electronAPI.send('INSTALL_UPDATE');
  }),
  onAction('SET_LAUNCHER', ({ payload }) => electronAPI.send('SET_LAUNCHER', payload)),
  // the main process has text of its own and follows the language from the saved settings
  // the handlers run before the reducer, so the saved settings get the new language here
  onAction('SET_LANGUAGE', ({ payload }) => saveSettings({ ...store.getState().uiState, language: payload.language })),
  // the main process matches its native parts (menus, dialogs) to the mode
  onAction('SET_THEME_MODE', ({ payload }) => {
    const { uiState } = store.getState();
    saveSettings({ ...uiState, theme: { ...uiState.theme, mode: payload.mode } });
  }),
  // the colour input fires while it is dragged, the main process does not need the accent before it is saved
  onAction('SET_ACCENT', () => saveAccent(store)),
  onAction('SAVE_SETTINGS', () => saveSettings(store.getState().uiState)),
]);

const middleware: Middleware<object, RootState> = (store) => {
  if (window) start(store);

  return handleActions(store);
};

export default middleware;
