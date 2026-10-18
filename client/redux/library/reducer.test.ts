import { describe, expect, it } from 'vitest';
import type { Track } from '../../../types/library';
import reducer from './reducer';
import type { LibraryState } from './reducer';

const createTrack = (overrides: Partial<Track> = {}): Track => ({
  path: '/music/album/01.flac',
  artist: 'Artist',
  album: 'Album',
  title: 'One',
  year: 2020,
  track: 1,
  disk: 1,
  genre: 'Rock',
  picture: null,
  duration: 100,
  ...overrides,
});

const store = (state: LibraryState | undefined, library: Track[], finished = true) => reducer(state, { type: 'STORE_LIBRARY', payload: { library, finished } });

describe('library reducer', () => {
  it('has an empty, unloaded initial state', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual({ tracks: [], albums: [], loaded: false });
  });

  it('groups tracks of the same folder and album into one album', () => {
    const state = store(undefined, [createTrack(), createTrack({ path: '/music/album/02.flac', title: 'Two', duration: 50 })]);

    expect(state.albums).toHaveLength(1);
    expect(state.albums[0]).toMatchObject({
      id: '/music/album - Album',
      title: 'Album',
      path: '/music/album',
      artist: 'Artist',
      duration: 150,
    });
    expect(state.albums[0].tracks).toHaveLength(2);
  });

  it('separates albums with the same title in different folders', () => {
    const state = store(undefined, [createTrack(), createTrack({ path: '/other/01.flac' })]);

    expect(state.albums.map((album) => album.id)).toEqual(['/music/album - Album', '/other - Album']);
  });

  it('strips the file protocol from pictures and uses the first one as the cover', () => {
    const state = store(undefined, [createTrack({ picture: 'file:///art/cover.jpg' })]);

    expect(state.tracks[0].picture).toBe('/art/cover.jpg');
    expect(state.albums[0].cover).toBe('/art/cover.jpg');
  });

  it('updates an already known track without duplicating or double counting its duration', () => {
    const first = store(undefined, [createTrack()]);
    const second = store(first, [createTrack({ title: 'Renamed', duration: 160 })]);

    expect(second.albums[0].tracks).toHaveLength(1);
    expect(second.albums[0].tracks[0].title).toBe('Renamed');
    expect(second.albums[0].duration).toBe(160);
  });

  it('adds new tracks to an existing album', () => {
    const first = store(undefined, [createTrack()]);
    const second = store(first, [createTrack({ path: '/music/album/02.flac', duration: 20 })]);

    expect(second.albums[0].tracks).toHaveLength(2);
    expect(second.albums[0].duration).toBe(120);
  });

  it('reflects the finished flag in loaded', () => {
    expect(store(undefined, [], false).loaded).toBe(false);
    expect(store(undefined, [], true).loaded).toBe(true);
  });

  it('ignores unrelated actions', () => {
    const state = store(undefined, [createTrack()]);

    expect(reducer(state, { type: 'SET_TAB', payload: { tab: 'local' } })).toBe(state);
  });
});
