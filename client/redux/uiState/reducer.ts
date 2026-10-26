import type { Reducer } from 'redux';
import { isAppAction } from '../types';
import type { OnlineView, UiState } from '../types';
import { radioUuidOf } from '../../radio-track';
import { clampGain, defaultGains, restoreGains } from '../../audio/equalizer';

const initialState: UiState = {
  view: 'albums',
  port: window.location.search.match(/^\?port=([0-9]+)/)?.[1] ?? '3000',
  onlineView: 'radio',
  tab: 'local',
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
  launcher: { available: false, enabled: false, offered: false },
  shuffle: false,
  repeat: false,
  equalizer: defaultGains,
  desktopBlur: false,
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
    case 'PLAY_TRACKS':
      return { ...state, nowPlaying: action.payload.tracks, played: [] };
    case 'PLAY_TRACK':
      return { ...state, currentSong: action.payload.track || null, isPlaying: true, streamTitle: null };
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
      return state.currentSong && radioUuidOf(state.currentSong.path) === uuid ? { ...state, streamTitle: title } : state;
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
        ...(settings.onlineView && { onlineView: restoreOnlineView() }),
        ...(settings.equalizer && { equalizer: restoreGains(settings.equalizer) }),
      };
    }
    default:
      return state;
  }
};

export default reducer;
