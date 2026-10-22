import { describe, expect, it } from 'vitest';
import type { AlbumSummary, Track } from '../../../types/library';
import reducer from './reducer';
import type { LibraryState } from './reducer';

const createTrack = (path: string): Track => ({
  path,
  artist: 'Artist',
  album: 'Album',
  title: path,
  year: 2020,
  track: 1,
  disk: 1,
  genre: 'Rock',
  picture: null,
  duration: 100,
});

const createAlbum = (id: string): AlbumSummary => ({ id, title: id, path: '/music', artist: 'Artist', cover: null, duration: 100, year: 2020, trackCount: 1 });

const storeTracks = (state: LibraryState | undefined, page: number, paths: string[], total: number) =>
  reducer(state, { type: 'STORE_TRACK_PAGE', payload: { page, items: paths.map(createTrack), total } });

describe('library reducer', () => {
  it('starts without pages and not loaded', () => {
    const state = reducer(undefined, { type: '@@INIT' });

    expect(state).toEqual({
      tracks: { total: undefined, pages: {}, stale: [] },
      albums: { total: undefined, pages: {}, stale: [] },
      loaded: false,
    });
  });

  it('stores pages of tracks and merges them, and is loaded with the first page', () => {
    const state = storeTracks(storeTracks(undefined, 0, ['/a'], 150), 1, ['/b'], 150);

    expect(state.loaded).toBe(true);
    expect(state.tracks.total).toBe(150);
    expect(Object.keys(state.tracks.pages)).toEqual(['0', '1']);
    expect(state.tracks.pages[1].map((track) => track.path)).toEqual(['/b']);
  });

  it('stores pages of albums apart from the tracks', () => {
    const state = reducer(undefined, { type: 'STORE_ALBUM_PAGE', payload: { page: 0, items: [createAlbum('one')], total: 1 } });

    expect(state.albums.pages[0].map((album) => album.id)).toEqual(['one']);
    expect(state.albums.total).toBe(1);
    expect(state.tracks.pages).toEqual({});
  });

  it('marks the cached pages stale on a change of the library, and keeps them to show', () => {
    const stored = storeTracks(storeTracks(undefined, 0, ['/a'], 150), 1, ['/b'], 150);
    const state = reducer(stored, { type: 'INVALIDATE_LIBRARY' });

    expect(state.tracks.stale).toEqual([0, 1]);
    expect(state.tracks.pages).toEqual(stored.tracks.pages);
  });

  it('replaces a stale page when it is fetched again, with the new total', () => {
    const stale = reducer(storeTracks(undefined, 0, ['/a', '/b'], 2), { type: 'INVALIDATE_LIBRARY' });
    const state = storeTracks(stale, 0, ['/a'], 1);

    expect(state.tracks.stale).toEqual([]);
    expect(state.tracks.total).toBe(1);
    expect(state.tracks.pages[0].map((track) => track.path)).toEqual(['/a']);
  });

  it('ignores unrelated actions', () => {
    const state = storeTracks(undefined, 0, ['/a'], 1);

    expect(reducer(state, { type: 'SET_TAB', payload: { tab: 'local' } })).toBe(state);
  });
});
