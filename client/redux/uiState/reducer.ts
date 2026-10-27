import type { Reducer } from 'redux';
import { knownFolders, parseFolders, restoreAlbumSort, restoreTrackSort } from '../../../types/library-query';
import { parseRadioQuery } from '../../../types/radio-query';
import { isAppAction } from '../types';
import type { OnlineView, UiState } from '../types';
import { radioUuidOf } from '../../radio-track';
import { defaultTheme, parseAccent, restoreTheme } from '../../theme';
import { clampGain, defaultGains, restoreGains } from '../../audio/equalizer';

const initialState: UiState = {
  view: 'albums',
  onlineView: 'radio',
  tab: 'home',
  nowPlaying: [],
  played: [],
  currentSong: null,
  currentTime: 0,
  volume: 0.5,
  selectedAlbum: null,
  scanningFolder: null,
  progress: 0,
  totalCount: 0,
  maximized: false,
  isPlaying: false,
  streamTitle: null,
  streamArt: null,
  launcher: { available: false, enabled: false, offered: false },
  shuffle: false,
  repeat: false,
  equalizer: defaultGains,
  desktopBlur: false,
  language: undefined,
  theme: defaultTheme,
  trackSort: undefined,
  albumSort: undefined,
  libraryFolders: [],
  radioQuery: {},
};

// the Shoutcast page and the Spotify page are gone, any other saved view shows the radio
const restoreOnlineView = (): OnlineView => 'radio';

const toNumber = (value: number | string) => parseFloat(`${value || 0}`);

const reducer: Reducer<UiState> = (state = initialState, action) => {
  if (!isAppAction(action)) return state;

  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, view: action.payload.view };
    case 'SET_ONLINE_VIEW':
      return { ...state, onlineView: action.payload.view };
    case 'SET_TRACK_SORT':
      return { ...state, trackSort: action.payload.sort };
    case 'SET_ALBUM_SORT':
      return { ...state, albumSort: action.payload.sort };
    case 'SET_LIBRARY_FOLDERS':
      return { ...state, libraryFolders: parseFolders(action.payload.folders) };
    // a folder that is not in the library any more is dropped from the selection
    case 'STORE_FOLDERS': {
      const libraryFolders = knownFolders(
        state.libraryFolders,
        action.payload.folders.map(({ path }) => path)
      );
      return libraryFolders.length === state.libraryFolders.length ? state : { ...state, libraryFolders };
    }
    // the page of a search is not part of what is saved
    case 'SEARCH_RADIO':
      return { ...state, radioQuery: parseRadioQuery(action.payload.query) };
    case 'PLAY_TRACKS':
      return { ...state, nowPlaying: action.payload.tracks, played: [] };
    case 'PLAY_TRACK':
      // the position of the previous song would seek the new one to its end
      return { ...state, currentSong: action.payload.track || null, currentTime: 0, isPlaying: true, streamTitle: null, streamArt: null };
    case 'SET_VOLUME':
      return { ...state, volume: toNumber(action.payload.volume) };
    case 'SET_CURRENT_TIME': {
      const currentTime = toNumber(action.payload.currentTime);
      return currentTime === state.currentTime ? state : { ...state, currentTime };
    }
    case 'SELECT_ALBUM':
      return { ...state, selectedAlbum: action.payload.album || null };
    case 'SET_GAIN': {
      const { value, index } = action.payload;
      return { ...state, equalizer: state.equalizer.map((gain, band) => (band === index ? clampGain(toNumber(value)) : gain)) };
    }
    case 'RADIO_STREAM_TITLE': {
      const { uuid, title } = action.payload;
      const isCurrent = state.currentSong && radioUuidOf(state.currentSong.path) === uuid;
      // a station can repeat its title, which keeps the art it has
      return isCurrent && title !== state.streamTitle ? { ...state, streamTitle: title, streamArt: null } : state;
    }
    case 'RADIO_STREAM_ART': {
      const { uuid, title, art } = action.payload;
      // the art of a song the station has moved on from is dropped
      return state.currentSong && radioUuidOf(state.currentSong.path) === uuid && title === state.streamTitle ? { ...state, streamArt: art } : state;
    }
    case 'SCANNING_FOLDER':
      return { ...state, scanningFolder: action.payload.folder };
    case 'SCANNING_FILE':
      return { ...state, progress: action.payload.progress, totalCount: action.payload.totalCount };
    case 'RESCAN_COMPLETE':
      return { ...state, scanningFolder: null };
    case 'TRACKS_ADDED_TO_LIBRARY':
      // the added folders are shown as soon as they are scanned, instead of the folder list they were added from
      return { ...state, scanningFolder: null, view: state.view === 'folders' ? 'albums' : state.view };
    case 'MAXIMIZED_APP':
      return { ...state, maximized: action.payload.maximized };
    case 'SET_TAB':
      return { ...state, tab: action.payload.tab };
    case 'LAUNCHER_STATE':
      return { ...state, launcher: action.payload };
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload.language };
    case 'SET_THEME_MODE':
      return { ...state, theme: { ...state.theme, mode: action.payload.mode } };
    case 'SET_ACCENT':
      return { ...state, theme: { ...state.theme, accent: parseAccent(action.payload.accent) } };
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload.isPlaying };
    case 'TOGGLE_REPEAT':
      return { ...state, repeat: !state.repeat };
    case 'TOGGLE_SHUFFLE':
      return { ...state, shuffle: !state.shuffle };
    case 'TOGGLE_DESKTOP_BLUR':
      return { ...state, desktopBlur: !state.desktopBlur };
    case 'CLEAR_PLAYED':
      return { ...state, played: [] };
    case 'POP_PLAYED':
      return { ...state, played: state.played.slice(0, -1) };
    case 'ADD_PLAYED':
      return { ...state, played: action.payload.track ? [...state.played, action.payload.track] : state.played };
    case 'RESTORE_SETTINGS': {
      const { settings } = action.payload;
      return {
        ...state,
        ...settings,
        // a tab saved by an earlier version does not decide where the app opens
        tab: state.tab,
        ...(settings.onlineView && { onlineView: restoreOnlineView() }),
        ...(settings.equalizer && { equalizer: restoreGains(settings.equalizer) }),
        ...(settings.theme && { theme: restoreTheme(settings.theme) }),
        // a saved value that is not valid gives the default order and all folders
        ...('trackSort' in settings && { trackSort: restoreTrackSort(settings.trackSort) }),
        ...('albumSort' in settings && { albumSort: restoreAlbumSort(settings.albumSort) }),
        ...('libraryFolders' in settings && { libraryFolders: parseFolders(settings.libraryFolders) }),
        // a saved filter or sort that is not valid is dropped
        ...('radioQuery' in settings && { radioQuery: parseRadioQuery(settings.radioQuery) }),
      };
    }
    default:
      return state;
  }
};

export default reducer;
