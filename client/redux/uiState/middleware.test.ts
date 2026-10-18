import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyMiddleware, createStore } from 'redux';
import type { Track } from '../../../types/library';
import reducers from '../reducers';
import type { AppAction } from '../types';
import middleware from './middleware';

const track = (path: string): Track => ({
  path,
  artist: '',
  album: '',
  title: '',
  year: '',
  track: '',
  disk: '',
  genre: '',
  picture: null,
  duration: null,
});

const [a, b, c] = ['a', 'b', 'c'].map(track);

const createTestStore = (uiState: Record<string, unknown>) => {
  const store = createStore(reducers, applyMiddleware(middleware));
  store.dispatch({ type: 'RESTORE_SETTINGS', payload: { settings: { nowPlaying: [a, b, c], ...uiState } } });
  return store;
};

const dispatch = (store: ReturnType<typeof createTestStore>, action: AppAction) => store.dispatch(action);

describe('uiState middleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('plays the first track of PLAY_TRACKS', () => {
    const store = createTestStore({});
    dispatch(store, { type: 'PLAY_TRACKS', payload: { tracks: [b, c] } });

    expect(store.getState().uiState.currentSong).toEqual(b);
  });

  it('FORCE_PLAY_TRACK clears history and plays the track', () => {
    const store = createTestStore({ played: [a] });
    dispatch(store, { type: 'FORCE_PLAY_TRACK', payload: { track: c } });

    expect(store.getState().uiState).toMatchObject({ currentSong: c, played: [], isPlaying: true });
  });

  it('CLICK_NOTIFICATION opens the now playing tab', () => {
    const store = createTestStore({});
    dispatch(store, { type: 'CLICK_NOTIFICATION' });

    expect(store.getState().uiState.tab).toBe('now-playing');
  });

  describe('NEXT_SONG', () => {
    it('plays the following track and records the current one as played', () => {
      const store = createTestStore({ currentSong: a });
      dispatch(store, { type: 'NEXT_SONG', payload: {} });

      expect(store.getState().uiState).toMatchObject({ currentSong: b, played: [a] });
    });

    it('keeps the current track at the end of the queue without repeat', () => {
      const store = createTestStore({ currentSong: c });
      dispatch(store, { type: 'NEXT_SONG', payload: {} });

      expect(store.getState().uiState.currentSong).toEqual(c);
    });

    it('wraps around to the first track with repeat and does not record history', () => {
      const store = createTestStore({ currentSong: c, repeat: true });
      dispatch(store, { type: 'NEXT_SONG', payload: {} });

      expect(store.getState().uiState).toMatchObject({ currentSong: a, played: [] });
    });

    it('TRACK_ENDED advances to the next song', () => {
      const store = createTestStore({ currentSong: a });
      dispatch(store, { type: 'TRACK_ENDED', payload: {} });

      expect(store.getState().uiState.currentSong).toEqual(b);
    });

    it('shuffle picks only tracks that were not played yet', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      const store = createTestStore({ currentSong: a, shuffle: true, played: [a, b] });
      dispatch(store, { type: 'NEXT_SONG', payload: {} });

      // only c was not played yet
      expect(store.getState().uiState.currentSong).toEqual(c);
    });

    it('shuffle with repeat ignores history', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);
      const store = createTestStore({ currentSong: a, shuffle: true, repeat: true, played: [a, b, c] });
      dispatch(store, { type: 'NEXT_SONG', payload: {} });

      expect(store.getState().uiState.currentSong).toEqual(c);
    });

    it('shuffle stops with no song when everything was played', () => {
      const store = createTestStore({ currentSong: a, shuffle: true, played: [a, b, c] });
      dispatch(store, { type: 'NEXT_SONG', payload: {} });

      expect(store.getState().uiState.currentSong).toBeNull();
    });
  });

  describe('PREVIOUS_SONG', () => {
    it('plays the preceding track', () => {
      const store = createTestStore({ currentSong: b });
      dispatch(store, { type: 'PREVIOUS_SONG' });

      expect(store.getState().uiState.currentSong).toEqual(a);
    });

    it('stays on the first track without repeat', () => {
      const store = createTestStore({ currentSong: a });
      dispatch(store, { type: 'PREVIOUS_SONG' });

      expect(store.getState().uiState.currentSong).toEqual(a);
    });

    it('wraps to the last track with repeat', () => {
      const store = createTestStore({ currentSong: a, repeat: true });
      dispatch(store, { type: 'PREVIOUS_SONG' });

      expect(store.getState().uiState.currentSong).toEqual(c);
    });
  });
});
