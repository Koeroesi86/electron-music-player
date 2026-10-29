import type { Track } from '../../../types/library';
import { toRadioTrack } from '../../radio-track';
import { actionMiddleware, onAction } from '../on-action';
import type { Store } from '../on-action';
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

const playNext = (store: Store) => {
  const state = store.getState().uiState;

  // shuffle keeps the history with repeat as well, so Previous can step back through it
  if (!state.repeat || state.shuffle) {
    store.dispatch({ type: 'ADD_PLAYED', payload: { track: state.currentSong } });
  }

  const upNext = pickNext(state);
  // with nothing left to play the current song stays and playback stops
  store.dispatch(upNext ? { type: 'PLAY_TRACK', payload: { track: { ...upNext } } } : { type: 'SET_PLAYING', payload: { isPlaying: false } });
};

const playPrevious = (store: Store) => {
  const state = store.getState().uiState;
  const previous = pickPrevious(state);
  if (!previous) return;

  if (state.shuffle) store.dispatch({ type: 'POP_PLAYED', payload: {} });
  store.dispatch({ type: 'PLAY_TRACK', payload: { track: { ...previous } } });
};

const middleware = actionMiddleware((store) => [
  onAction('TRACK_ENDED', () => store.dispatch({ type: 'NEXT_SONG', payload: {} })),
  onAction('FORCE_PLAY_TRACK', ({ payload }) => {
    store.dispatch({ type: 'CLEAR_PLAYED', payload: {} });
    store.dispatch({ type: 'PLAY_TRACK', payload: { track: payload.track } });
  }),
  onAction('PLAY_RADIO_STATION', ({ payload }) => store.dispatch({ type: 'PLAY_TRACKS', payload: { tracks: [toRadioTrack(payload.station)] } })),
  onAction('NEXT_SONG', () => playNext(store)),
  onAction('PREVIOUS_SONG', () => playPrevious(store)),
  onAction('PLAY_TRACKS', ({ payload }) => store.dispatch({ type: 'PLAY_TRACK', payload: { track: payload.tracks[0] || null } })),
  // with nothing loaded the first track that is added starts playing, as it is the only thing to play
  onAction('ADD_TO_QUEUE', ({ payload }) => {
    const [first] = payload.tracks;
    if (!store.getState().uiState.currentSong && first) store.dispatch({ type: 'PLAY_TRACK', payload: { track: first } });
  }),
  onAction('CLICK_NOTIFICATION', () => store.dispatch({ type: 'SET_TAB', payload: { tab: 'now-playing' } })),
]);

export default middleware;
