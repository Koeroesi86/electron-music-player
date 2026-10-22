import type { Reducer } from 'redux';
import { isAppAction } from '../types';
import type { UiState } from '../types';
import { clampGain, defaultGains, restoreGains } from '../../audio/equalizer';

const initialState: UiState = {
  view: 'albums',
  port: window.location.search.match(/^\?port=([0-9]+)/)?.[1] ?? '3000',
  onlineView: 'shoutcast',
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
  shuffle: false,
  repeat: false,
  equalizer: defaultGains,
};

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
      return { ...state, currentSong: action.payload.track || null, isPlaying: true };
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
    case 'SCANNING_FOLDER':
      return { ...state, scanningFolder: action.payload.folder };
    case 'SCANNING_FILE':
      return { ...state, progress: action.payload.progress, totalCount: action.payload.totalCount };
    case 'STORE_LIBRARY':
      return { ...state, scanningFolder: null };
    case 'MAXIMIZED_APP':
      return { ...state, maximized: action.payload.maximized };
    case 'SET_TAB':
      return { ...state, tab: action.payload.tab };
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload.isPlaying };
    case 'TOGGLE_REPEAT':
      return { ...state, repeat: !state.repeat };
    case 'TOGGLE_SHUFFLE':
      return { ...state, shuffle: !state.shuffle };
    case 'CLEAR_PLAYED':
      return { ...state, played: [] };
    case 'POP_PLAYED':
      return { ...state, played: state.played.slice(0, -1) };
    case 'ADD_PLAYED':
      return { ...state, played: action.payload.track ? [...state.played, action.payload.track] : state.played };
    case 'RESTORE_SETTINGS': {
      const { settings } = action.payload;
      return { ...state, ...settings, ...(settings.equalizer && { equalizer: restoreGains(settings.equalizer) }) };
    }
    default:
      return state;
  }
};

export default reducer;
