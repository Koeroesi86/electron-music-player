import type { Middleware } from 'redux';
import type { Track } from '../../../types/library';
import type { RootState } from '../reducers';
import { isAppAction } from '../types';
import type { UiState } from '../types';

const shufflePlaylist = (playList: Track[] = [], played: Track[] = []): Track | undefined => {
  const filtered = playList.filter((track) => played.findIndex((t) => t.path === track.path) === -1);

  return filtered[Math.floor(Math.random() * filtered.length)];
};

const currentIndexOf = ({ nowPlaying, currentSong }: UiState) => nowPlaying.findIndex((track) => track.path === currentSong?.path);

const pickNext = (state: UiState): Track | undefined => {
  const { nowPlaying, repeat, shuffle, played } = state;
  if (shuffle) return shufflePlaylist(nowPlaying, repeat ? [] : played);

  return nowPlaying[currentIndexOf(state) + 1] ?? (repeat ? nowPlaying[0] : undefined);
};

const pickPrevious = (state: UiState): Track | undefined => {
  const { nowPlaying, repeat, shuffle, played } = state;
  if (shuffle) return played[played.length - 1];

  return nowPlaying[currentIndexOf(state) - 1] ?? (repeat ? nowPlaying[nowPlaying.length - 1] : undefined);
};

const middleware: Middleware<object, RootState> = (store) => (next) => (action) => {
  if (!isAppAction(action)) return next(action);

  switch (action.type) {
    case 'TRACK_ENDED':
      store.dispatch({ type: 'NEXT_SONG', payload: {} });
      break;
    case 'FORCE_PLAY_TRACK':
      store.dispatch({ type: 'CLEAR_PLAYED', payload: {} });
      store.dispatch({ type: 'PLAY_TRACK', payload: { track: action.payload.track } });
      break;
    case 'NEXT_SONG': {
      const state = store.getState().uiState;

      // shuffle keeps the history with repeat as well, so Previous can step back through it
      if (!state.repeat || state.shuffle) {
        store.dispatch({ type: 'ADD_PLAYED', payload: { track: state.currentSong } });
      }

      const upNext = pickNext(state);
      // with nothing left to play the current song stays and playback stops
      store.dispatch(upNext ? { type: 'PLAY_TRACK', payload: { track: { ...upNext } } } : { type: 'SET_PLAYING', payload: { isPlaying: false } });
      break;
    }
    case 'PREVIOUS_SONG': {
      const state = store.getState().uiState;
      const previous = pickPrevious(state);
      if (!previous) break;

      if (state.shuffle) store.dispatch({ type: 'POP_PLAYED', payload: {} });
      store.dispatch({ type: 'PLAY_TRACK', payload: { track: { ...previous } } });
      break;
    }
    case 'PLAY_TRACKS':
      store.dispatch({ type: 'PLAY_TRACK', payload: { track: action.payload.tracks[0] || null } });
      break;
    case 'CLICK_NOTIFICATION':
      store.dispatch({ type: 'SET_TAB', payload: { tab: 'now-playing' } });
      break;
  }

  return next(action);
};

export default middleware;
