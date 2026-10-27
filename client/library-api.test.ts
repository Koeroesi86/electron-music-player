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

    expect(await fetchTrackPage('3000', 2, unsorted)).toEqual({ items: [track('/a', '/art.jpg')], total: 250 });
    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:3000/library/tracks?offset=200&limit=100');
  });

  it('fetches the page of albums and strips the file protocol of the covers', async () => {
    respond({ items: [album], total: 1 });

    expect(await fetchAlbumPage('3000', 0, unsorted)).toEqual({ items: [{ ...album, cover: '/art.jpg' }], total: 1 });
    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:3000/library/albums?offset=0&limit=100');
  });

  it('fetches the whole library', async () => {
    respond([track('/a'), track('/b')]);

    expect((await fetchLibrary('3000', unsorted)).map((item) => item.path)).toEqual(['/a', '/b']);
  });

  it('asks for the sort and the folders, with the characters of a path escaped', async () => {
    respond({ items: [], total: 0 });

    await fetchTrackPage('3000', 1, { sort: { field: 'year', direction: 'desc' }, folders: ['/m/a&b', 'C:\\Music'] });
    await fetchAlbumPage('3000', 0, { sort: { field: 'trackCount', direction: 'asc' }, folders: [] });
    await fetchAlbumPage('3000', 0, { sort: undefined, folders: ['/m'] });

    expect(vi.mocked(fetch).mock.calls.map(([url]) => url)).toEqual([
      'http://127.0.0.1:3000/library/tracks?offset=100&limit=100&sort=year&dir=desc&folder=%2Fm%2Fa%26b&folder=C%3A%5CMusic',
      'http://127.0.0.1:3000/library/albums?offset=0&limit=100&sort=trackCount&dir=asc',
      'http://127.0.0.1:3000/library/albums?offset=0&limit=100&folder=%2Fm',
    ]);
  });

  it('fetches the library in the order and the folders of the query', async () => {
    respond([]);

    await fetchLibrary('3000', { sort: { field: 'title', direction: 'asc' }, folders: ['/m'] });

    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:3000/library?sort=title&dir=asc&folder=%2Fm');
  });

  it('fetches the tracks of an album and keeps the album without its track count', async () => {
    respond([track('/m/1')]);

    const { trackCount: _trackCount, ...summary } = album;
    expect(await fetchAlbum(album, '3000')).toEqual({ ...summary, tracks: [track('/m/1')] });
    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:3000/library/album?path=%2Fm&title=A%20B');
  });

  it('throws when the response is not ok', async () => {
    respond({}, false);

    await expect(fetchTrackPage('3000', 0, unsorted)).rejects.toThrow('500');
  });

  it('does not request from a port that is not a number', async () => {
    respond({});

    await expect(fetchTrackPage('3000@example.com', 0, unsorted)).rejects.toThrow('Invalid port');
    expect(fetch).not.toHaveBeenCalled();
  });
});
