import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AlbumSummary, Track } from '../types/library';
import { fetchAlbum, fetchAlbumPage, fetchLibrary, fetchTrackPage } from './library-api';

const track = (path: string, picture: string | null = null): Track => ({
  path,
  artist: '',
  album: '',
  title: '',
  year: '',
  track: '',
  disk: '',
  genre: '',
  picture,
  duration: null,
});

const album: AlbumSummary = { id: '/m - A', title: 'A B', path: '/m', artist: '', cover: 'file:///art.jpg', duration: 1, year: '', trackCount: 2 };

const unsorted = { sort: undefined, folders: [] };

const respond = (body: unknown, ok = true) =>
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) }));

describe('library api', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('fetches the page of tracks by its offset and strips the file protocol of the pictures', async () => {
    respond({ items: [track('/a', 'file:///art.jpg')], total: 250 });

    expect(await fetchTrackPage(2, unsorted)).toEqual({ items: [track('/a', '/art.jpg')], total: 250 });
    expect(fetch).toHaveBeenCalledWith('emusic://app/library/tracks?offset=200&limit=100');
  });

  it('fetches the page of albums and strips the file protocol of the covers', async () => {
    respond({ items: [album], total: 1 });

    expect(await fetchAlbumPage(0, unsorted)).toEqual({ items: [{ ...album, cover: '/art.jpg' }], total: 1 });
    expect(fetch).toHaveBeenCalledWith('emusic://app/library/albums?offset=0&limit=100');
  });

  it('fetches the whole library', async () => {
    respond([track('/a'), track('/b')]);

    expect((await fetchLibrary(unsorted)).map((item) => item.path)).toEqual(['/a', '/b']);
  });

  it('asks for the sort and the folders, with the characters of a path escaped', async () => {
    respond({ items: [], total: 0 });

    await fetchTrackPage(1, { sort: { field: 'year', direction: 'desc' }, folders: ['/m/a&b', 'C:\\Music'] });
    await fetchAlbumPage(0, { sort: { field: 'trackCount', direction: 'asc' }, folders: [] });
    await fetchAlbumPage(0, { sort: undefined, folders: ['/m'] });

    expect(vi.mocked(fetch).mock.calls.map(([url]) => url)).toEqual([
      'emusic://app/library/tracks?offset=100&limit=100&sort=year&dir=desc&folder=%2Fm%2Fa%26b&folder=C%3A%5CMusic',
      'emusic://app/library/albums?offset=0&limit=100&sort=trackCount&dir=asc',
      'emusic://app/library/albums?offset=0&limit=100&folder=%2Fm',
    ]);
  });

  it('asks for the search, with its characters escaped, and for none when there is none', async () => {
    respond({ items: [], total: 0 });

    await fetchTrackPage(0, { sort: undefined, folders: [], search: 'a&b é' });
    await fetchAlbumPage(0, { sort: undefined, folders: ['/m'], search: 'halo' });
    await fetchAlbumPage(0, { sort: undefined, folders: [], search: undefined });

    expect(vi.mocked(fetch).mock.calls.map(([url]) => url)).toEqual([
      'emusic://app/library/tracks?offset=0&limit=100&search=a%26b%20%C3%A9',
      'emusic://app/library/albums?offset=0&limit=100&folder=%2Fm&search=halo',
      'emusic://app/library/albums?offset=0&limit=100',
    ]);
  });

  it('fetches the library of the search', async () => {
    respond([]);

    await fetchLibrary({ sort: undefined, folders: [], search: 'halo' });

    expect(fetch).toHaveBeenCalledWith('emusic://app/library?search=halo');
  });

  it('fetches the library in the order and the folders of the query', async () => {
    respond([]);

    await fetchLibrary({ sort: { field: 'title', direction: 'asc' }, folders: ['/m'] });

    expect(fetch).toHaveBeenCalledWith('emusic://app/library?sort=title&dir=asc&folder=%2Fm');
  });

  it('fetches the tracks of an album and keeps the album without its track count', async () => {
    respond([track('/m/1')]);

    const { trackCount: _trackCount, ...summary } = album;
    expect(await fetchAlbum(album)).toEqual({ ...summary, tracks: [track('/m/1')] });
    expect(fetch).toHaveBeenCalledWith('emusic://app/library/album?path=%2Fm&title=A%20B');
  });

  it('throws when the response is not ok', async () => {
    respond({}, false);

    await expect(fetchTrackPage(0, unsorted)).rejects.toThrow('500');
  });
});
