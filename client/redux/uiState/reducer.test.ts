import { describe, expect, it } from 'vitest';
import type { Album, Track } from '../../../types/library';
import type { AppAction, UiState } from '../types';
import reducer from './reducer';

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

const initial = reducer(undefined, { type: '@@INIT' });
const run = (action: AppAction, state: UiState = initial) => reducer(state, action);

describe('uiState reducer', () => {
  it('provides sensible defaults', () => {
    expect(initial).toMatchObject({
      view: 'albums',
      tab: 'local',
      port: '3000',
      volume: 0.5,
      isPlaying: false,
      shuffle: false,
      repeat: false,
      currentSong: null,
    });
    expect(initial.equalizer).toEqual(Array(10).fill(0));
  });

  it('returns the same state for unknown actions', () => {
    expect(reducer(initial, { type: 'UNKNOWN' })).toBe(initial);
    expect(reducer(initial, null as never)).toBe(initial);
  });

  it('switches views and tabs', () => {
    expect(run({ type: 'SET_VIEW', payload: { view: 'tracks' } }).view).toBe('tracks');
    expect(run({ type: 'SET_ONLINE_VIEW', payload: { view: 'radio' } }).onlineView).toBe('radio');
    expect(run({ type: 'SET_TAB', payload: { tab: 'settings' } }).tab).toBe('settings');
  });

  it('shows the albums once the added folders are scanned, and keeps any other view', () => {
    expect(run({ type: 'TRACKS_ADDED_TO_LIBRARY' }, { ...initial, view: 'folders', scanningFolder: '/music' })).toMatchObject({
      view: 'albums',
      scanningFolder: null,
    });
    expect(run({ type: 'TRACKS_ADDED_TO_LIBRARY' }, { ...initial, view: 'tracks' }).view).toBe('tracks');
  });

  it('replaces the queue and clears history on PLAY_TRACKS', () => {
    const state = run({ type: 'PLAY_TRACKS', payload: { tracks: [track('a')] } }, { ...initial, played: [track('old')] });

    expect(state.nowPlaying).toEqual([track('a')]);
    expect(state.played).toEqual([]);
  });

  it('starts playing on PLAY_TRACK and falls back to no song', () => {
    const playing = run({ type: 'PLAY_TRACK', payload: { track: track('a') } });
    expect(playing).toMatchObject({ currentSong: track('a'), isPlaying: true });
    expect(run({ type: 'PLAY_TRACK', payload: { track: null } }).currentSong).toBeNull();
  });

  it('parses the volume and defaults invalid values to 0', () => {
    expect(run({ type: 'SET_VOLUME', payload: { volume: '0.8' } }).volume).toBe(0.8);
    expect(run({ type: 'SET_VOLUME', payload: { volume: 0 } }).volume).toBe(0);
  });

  it('keeps the same state when the current time did not change', () => {
    const state = run({ type: 'SET_CURRENT_TIME', payload: { currentTime: '12.5' } });

    expect(state.currentTime).toBe(12.5);
    expect(reducer(state, { type: 'SET_CURRENT_TIME', payload: { currentTime: 12.5 } })).toBe(state);
  });

  it('selects and deselects an album', () => {
    const album = { id: 'a' } as Album;
    const state = run({ type: 'SELECT_ALBUM', payload: { album } });

    expect(state.selectedAlbum).toEqual(album);
    expect(run({ type: 'SELECT_ALBUM', payload: { album: null } }, state).selectedAlbum).toBeNull();
  });

  it('sets a single equalizer gain in dB without mutating the previous state', () => {
    const state = run({ type: 'SET_GAIN', payload: { value: '6.5', index: 2 } });

    expect(state.equalizer[2]).toBe(6.5);
    expect(state.equalizer[1]).toBe(0);
    expect(initial.equalizer[2]).toBe(0);
  });

  it('keeps an equalizer gain within the slider range', () => {
    expect(run({ type: 'SET_GAIN', payload: { value: 40, index: 0 } }).equalizer[0]).toBe(12);
    expect(run({ type: 'SET_GAIN', payload: { value: -40, index: 0 } }).equalizer[0]).toBe(-12);
  });

  it('restores saved equalizer gains and drops ones from before gains were in dB', () => {
    const saved = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(run({ type: 'RESTORE_SETTINGS', payload: { settings: { equalizer: saved } } }).equalizer).toEqual(saved);
    expect(run({ type: 'RESTORE_SETTINGS', payload: { settings: { equalizer: Array(12).fill(-40) } } }).equalizer).toEqual(Array(10).fill(0));
  });

  it('tracks scanning progress and ends scanning when the rescan is complete', () => {
    const scanning = run({ type: 'SCANNING_FOLDER', payload: { folder: '/music' } });
    expect(scanning.scanningFolder).toBe('/music');
    expect(run({ type: 'SCANNING_FILE', payload: { fileName: 'a', progress: 3, totalCount: 10 } }, scanning)).toMatchObject({ progress: 3, totalCount: 10 });
    expect(run({ type: 'RESCAN_COMPLETE' }, scanning).scanningFolder).toBeNull();
  });

  it('toggles repeat and shuffle', () => {
    expect(run({ type: 'TOGGLE_REPEAT' }).repeat).toBe(true);
    expect(run({ type: 'TOGGLE_SHUFFLE' }).shuffle).toBe(true);
    expect(run({ type: 'TOGGLE_REPEAT' }, { ...initial, repeat: true }).repeat).toBe(false);
  });

  it('toggles whether the desktop blurs behind the window, off until it is turned on', () => {
    expect(initial.desktopBlur).toBe(false);
    expect(run({ type: 'TOGGLE_DESKTOP_BLUR' }).desktopBlur).toBe(true);
    expect(run({ type: 'TOGGLE_DESKTOP_BLUR' }, { ...initial, desktopBlur: true }).desktopBlur).toBe(false);
    expect(run({ type: 'RESTORE_SETTINGS', payload: { settings: { desktopBlur: true } } }).desktopBlur).toBe(true);
  });

  it('follows the system language until one is picked, and restores the picked one', () => {
    expect(initial.language).toBeUndefined();
    expect(run({ type: 'SET_LANGUAGE', payload: { language: 'hu' } }).language).toBe('hu');
    expect(run({ type: 'SET_LANGUAGE', payload: { language: undefined } }, { ...initial, language: 'hu' }).language).toBeUndefined();
    expect(run({ type: 'RESTORE_SETTINGS', payload: { settings: { language: 'hu' } } }).language).toBe('hu');
  });

  it('records and clears played tracks, ignoring null tracks', () => {
    const one = run({ type: 'ADD_PLAYED', payload: { track: track('a') } });
    expect(one.played).toEqual([track('a')]);
    expect(run({ type: 'ADD_PLAYED', payload: { track: null } }, one).played).toEqual([track('a')]);
    expect(run({ type: 'CLEAR_PLAYED' }, one).played).toEqual([]);
    expect(run({ type: 'POP_PLAYED' }, run({ type: 'ADD_PLAYED', payload: { track: track('b') } }, one)).played).toEqual([track('a')]);
  });

  it('updates maximized and playing flags', () => {
    expect(run({ type: 'MAXIMIZED_APP', payload: { maximized: true } }).maximized).toBe(true);
    expect(run({ type: 'SET_PLAYING', payload: { isPlaying: true } }).isPlaying).toBe(true);
  });

  it('stores whether the app can be added to the application menu, and whether it was', () => {
    expect(initial.launcher).toEqual({ available: false, enabled: false, offered: false });
    expect(run({ type: 'LAUNCHER_STATE', payload: { available: true, enabled: true, offered: true } }).launcher).toEqual({
      available: true,
      enabled: true,
      offered: true,
    });
  });

  it('merges restored settings', () => {
    expect(run({ type: 'RESTORE_SETTINGS', payload: { settings: { volume: 0.2, tab: 'equalizer' } } })).toMatchObject({
      volume: 0.2,
      tab: 'equalizer',
      view: 'albums',
    });
  });

  describe('radio', () => {
    const playing = { ...initial, currentSong: track('radio:abc'), streamTitle: null };

    it('shows the radio first', () => {
      expect(initial.onlineView).toBe('radio');
    });

    it.each(['shoutcast', 'spotify', 'unknown'])('restores the saved %s view as the radio', (saved) => {
      const settings = { onlineView: saved } as never;
      expect(run({ type: 'RESTORE_SETTINGS', payload: { settings } }).onlineView).toBe('radio');
    });

    it('keeps the title the stream announces', () => {
      expect(run({ type: 'RADIO_STREAM_TITLE', payload: { uuid: 'abc', title: 'Artist - Song' } }, playing).streamTitle).toBe('Artist - Song');
    });

    it('ignores the title of a station that is not playing', () => {
      expect(run({ type: 'RADIO_STREAM_TITLE', payload: { uuid: 'other', title: 'Artist - Song' } }, playing)).toBe(playing);
      expect(run({ type: 'RADIO_STREAM_TITLE', payload: { uuid: 'abc', title: 'Artist - Song' } })).toBe(initial);
    });

    it('forgets the title when another track starts', () => {
      const titled = { ...playing, streamTitle: 'Artist - Song' };
      expect(run({ type: 'PLAY_TRACK', payload: { track: track('/music/a.flac') } }, titled).streamTitle).toBeNull();
    });
  });
});
