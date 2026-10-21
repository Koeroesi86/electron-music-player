import type { Middleware } from 'redux';
import type { Track } from '../../../types/library';
import type { RootState } from '../reducers';
import { isAppAction } from '../types';

const shufflePlaylist = (playList: Track[] = [], played: Track[] = []): Track | undefined => {
  const filtered = playList.slice().filter((track) => played.findIndex((t) => t.path === track.path) === -1);

  return filtered[Math.floor(Math.random() * filtered.length)];
};

// TODO: simplify
const middleware: Middleware<object, RootState> = (store) => (next) => (action) => {
  if (!isAppAction(action)) return next(action);

  if (action.type === 'TRACK_ENDED') {
    store.dispatch({ type: 'NEXT_SONG', payload: {} });
  }

  if (action.type === 'FORCE_PLAY_TRACK') {
    store.dispatch({ type: 'CLEAR_PLAYED', payload: {} });
    store.dispatch({ type: 'PLAY_TRACK', payload: { track: action.payload.track } });
  }

  if (action.type === 'NEXT_SONG') {
    const { nowPlaying, currentSong, repeat, shuffle, played } = store.getState().uiState;

    // shuffle keeps the history with repeat as well, so Previous can step back through it
    if (!repeat || shuffle) {
      store.dispatch({ type: 'ADD_PLAYED', payload: { track: currentSong } });
    }

    const currentIndex = nowPlaying.findIndex((track) => track.path === currentSong?.path);
    const next = shuffle ? shufflePlaylist(nowPlaying, repeat ? [] : played) : (nowPlaying[currentIndex + 1] ?? (repeat ? nowPlaying[0] : undefined));

    // with nothing left to play the current song stays and playback stops
    store.dispatch(next ? { type: 'PLAY_TRACK', payload: { track: Object.assign({}, next) } } : { type: 'SET_PLAYING', payload: { isPlaying: false } });
  }

  if (action.type === 'PREVIOUS_SONG') {
    const { nowPlaying, currentSong, repeat, shuffle, played } = store.getState().uiState;
    const currentIndex = nowPlaying.findIndex((track) => track.path === currentSong?.path);
    const previous = shuffle ? played[played.length - 1] : (nowPlaying[currentIndex - 1] ?? (repeat ? nowPlaying[nowPlaying.length - 1] : undefined));

    if (shuffle && previous) {
      store.dispatch({ type: 'POP_PLAYED', payload: {} });
    }

    if (previous) {
      store.dispatch({ type: 'PLAY_TRACK', payload: { track: Object.assign({}, previous) } });
    }
  }

  if (action.type === 'PLAY_TRACKS') {
    const { tracks } = action.payload;
    store.dispatch({ type: 'PLAY_TRACK', payload: { track: tracks[0] || null } });
  }

  if (action.type === 'CLICK_NOTIFICATION') {
    store.dispatch({ type: 'SET_TAB', payload: { tab: 'now-playing' } });
  }

  return next(action);
};

export default middleware;
