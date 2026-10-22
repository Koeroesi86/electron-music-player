import type { Album, AlbumSummary, LibraryPage, Track } from '../types/library';
import { pageSize } from './redux/library/pages';

const getJson = async <T>(port: string, route: string): Promise<T> => {
  const response = await fetch(`http://127.0.0.1:${port}${route}`);
  if (!response.ok) throw new Error(`Failed to fetch ${route}: ${response.status}`);

  return response.json();
};

const withoutFileProtocol = (picture: string | null) => picture?.replace(/^file:\/\//, '') ?? null;

const toTrack = (track: Track): Track => ({ ...track, picture: withoutFileProtocol(track.picture) });

const toWindowQuery = (page: number) => `offset=${page * pageSize}&limit=${pageSize}`;

export const fetchTrackPage = (port: string, page: number) =>
  getJson<LibraryPage<Track>>(port, `/library/tracks?${toWindowQuery(page)}`).then(({ items, total }) => ({ items: items.map(toTrack), total }));

export const fetchAlbumPage = (port: string, page: number) =>
  getJson<LibraryPage<AlbumSummary>>(port, `/library/albums?${toWindowQuery(page)}`).then(({ items, total }) => ({
    items: items.map((album) => ({ ...album, cover: withoutFileProtocol(album.cover) })),
    total,
  }));

/** The whole library at once, for what needs every track */
export const fetchLibrary = (port: string) => getJson<Track[]>(port, '/library').then((library) => library.map(toTrack));

/** The album of a summary with its tracks */
export const fetchAlbum = ({ trackCount: _trackCount, ...album }: AlbumSummary, port: string): Promise<Album> =>
  getJson<Track[]>(port, `/library/album?path=${encodeURIComponent(album.path)}&title=${encodeURIComponent(album.title)}`).then((tracks) => ({
    ...album,
    tracks: tracks.map(toTrack),
  }));
