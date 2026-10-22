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

const respond = (body: unknown, ok = true) =>
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) }));

describe('library api', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('fetches the page of tracks by its offset and strips the file protocol of the pictures', async () => {
    respond({ items: [track('/a', 'file:///art.jpg')], total: 250 });

    expect(await fetchTrackPage('3000', 2)).toEqual({ items: [track('/a', '/art.jpg')], total: 250 });
    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:3000/library/tracks?offset=200&limit=100');
  });

  it('fetches the page of albums and strips the file protocol of the covers', async () => {
    respond({ items: [album], total: 1 });

    expect(await fetchAlbumPage('3000', 0)).toEqual({ items: [{ ...album, cover: '/art.jpg' }], total: 1 });
    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:3000/library/albums?offset=0&limit=100');
  });

  it('fetches the whole library', async () => {
    respond([track('/a'), track('/b')]);

    expect((await fetchLibrary('3000')).map((item) => item.path)).toEqual(['/a', '/b']);
  });

  it('fetches the tracks of an album and keeps the album without its track count', async () => {
    respond([track('/m/1')]);

    const { trackCount: _trackCount, ...summary } = album;
    expect(await fetchAlbum(album, '3000')).toEqual({ ...summary, tracks: [track('/m/1')] });
    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:3000/library/album?path=%2Fm&title=A%20B');
  });

  it('throws when the response is not ok', async () => {
    respond({}, false);

    await expect(fetchTrackPage('3000', 0)).rejects.toThrow('500');
  });
});
