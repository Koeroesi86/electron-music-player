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

const reducer: Reducer<UiState> = (state = initialState, action) => {
  if (!isAppAction(action)) return state;

  if (action.type === 'SET_VIEW') {
    return Object.assign({}, state, { view: action.payload.view });
  }

  if (action.type === 'SET_ONLINE_VIEW') {
    return Object.assign({}, state, { onlineView: action.payload.view });
  }

  if (action.type === 'PLAY_TRACKS') {
    const { tracks } = action.payload;
    return Object.assign({}, state, {
      nowPlaying: tracks,
      played: [],
    });
  }

  if (action.type === 'PLAY_TRACK') {
    return Object.assign({}, state, {
      currentSong: action.payload.track || null,
      isPlaying: true,
    });
  }

  if (action.type === 'SET_VOLUME') {
    return Object.assign({}, state, {
      volume: parseFloat(`${action.payload.volume || 0}`),
    });
  }

  if (action.type === 'SET_CURRENT_TIME') {
    const currentTime = parseFloat(`${action.payload.currentTime || 0}`);
    if (currentTime === state.currentTime) return state;

    return Object.assign({}, state, {
      currentTime,
    });
  }

  if (action.type === 'SELECT_ALBUM') {
    return Object.assign({}, state, {
      selectedAlbum: action.payload.album || null,
    });
  }

  if (action.type === 'SET_GAIN') {
    const { value, index } = action.payload;
    const equalizer = state.equalizer.slice();
    equalizer[index] = clampGain(parseFloat(`${value}`));
    return Object.assign({}, state, {
      equalizer,
    });
  }

  if (action.type === 'SCANNING_FOLDER') {
    const { folder } = action.payload;
    return Object.assign({}, state, {
      scanningFolder: folder,
    });
  }

  if (action.type === 'SCANNING_FILE') {
    const { progress, totalCount } = action.payload;
    return Object.assign({}, state, {
      progress,
      totalCount,
    });
  }

  if (action.type === 'STORE_LIBRARY') {
    return Object.assign({}, state, {
      scanningFolder: null,
    });
  }

  if (action.type === 'MAXIMIZED_APP') {
    return Object.assign({}, state, {
      maximized: action.payload.maximized,
    });
  }

  if (action.type === 'SET_TAB') {
    return Object.assign({}, state, {
      tab: action.payload.tab,
    });
  }

  if (action.type === 'SET_PLAYING') {
    return Object.assign({}, state, {
      isPlaying: action.payload.isPlaying,
    });
  }

  if (action.type === 'TOGGLE_REPEAT') {
    return Object.assign({}, state, {
      repeat: !state.repeat,
    });
  }

  if (action.type === 'TOGGLE_SHUFFLE') {
    return Object.assign({}, state, {
      shuffle: !state.shuffle,
    });
  }

  if (action.type === 'CLEAR_PLAYED') {
    return Object.assign({}, state, {
      played: [],
    });
  }

  if (action.type === 'POP_PLAYED') {
    return Object.assign({}, state, {
      played: state.played.slice(0, -1),
    });
  }

  if (action.type === 'ADD_PLAYED') {
    const { track } = action.payload;
    const played = state.played.slice();
    if (track) played.push(track);
    return Object.assign({}, state, {
      played,
    });
  }

  if (action.type === 'RESTORE_SETTINGS') {
    const { settings } = action.payload;
    return Object.assign({}, state, settings, settings.equalizer && { equalizer: restoreGains(settings.equalizer) });
  }

  return state;
};

export default reducer;
