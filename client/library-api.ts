import type { Album, AlbumSummary, LibraryPage, Track } from '../types/library';
import type { AlbumSort, LibraryQuery, TrackSort } from '../types/library-query';
import { pageSize } from './redux/library/pages';

const toLocalUrl = (port: string, route: string) => {
  if (!/^\d{1,5}$/.test(port)) throw new Error(`Invalid port: ${port}`);

  return new URL(route, `http://127.0.0.1:${Number(port)}`);
};

const getJson = async <T>(port: string, route: string): Promise<T> => {
  const response = await fetch(toLocalUrl(port, route).href);
  if (!response.ok) throw new Error(`Failed to fetch ${route}: ${response.status}`);

  return response.json();
};

const withoutFileProtocol = (picture: string | null) => picture?.replace(/^file:\/\//, '') ?? null;

const toTrack = (track: Track): Track => ({ ...track, picture: withoutFileProtocol(track.picture) });

const toWindowQuery = (page: number) => `offset=${page * pageSize}&limit=${pageSize}`;

/** The sort and the folders as the parameters of a request, the folders once each */
const toQuery = ({ sort, folders }: LibraryQuery<TrackSort | AlbumSort>) =>
  [...(sort ? [`sort=${sort.field}`, `dir=${sort.direction}`] : []), ...folders.map((folder) => `folder=${encodeURIComponent(folder)}`)].join('&');

const withQuery = (route: string, query: LibraryQuery<TrackSort | AlbumSort>) => [route, toQuery(query)].filter(Boolean).join(route.includes('?') ? '&' : '?');

export const fetchTrackPage = (port: string, page: number, query: LibraryQuery<TrackSort>) =>
  getJson<LibraryPage<Track>>(port, withQuery(`/library/tracks?${toWindowQuery(page)}`, query)).then(({ items, total }) => ({
    items: items.map(toTrack),
    total,
  }));

export const fetchAlbumPage = (port: string, page: number, query: LibraryQuery<AlbumSort>) =>
  getJson<LibraryPage<AlbumSummary>>(port, withQuery(`/library/albums?${toWindowQuery(page)}`, query)).then(({ items, total }) => ({
    items: items.map((album) => ({ ...album, cover: withoutFileProtocol(album.cover) })),
    total,
  }));

/** The tracks of the query at once, for what needs every track */
export const fetchLibrary = (port: string, query: LibraryQuery<TrackSort>) =>
  getJson<Track[]>(port, withQuery('/library', query)).then((library) => library.map(toTrack));

/** The album of a summary with its tracks */
export const fetchAlbum = ({ trackCount: _trackCount, ...album }: AlbumSummary, port: string): Promise<Album> =>
  getJson<Track[]>(port, `/library/album?path=${encodeURIComponent(album.path)}&title=${encodeURIComponent(album.title)}`).then((tracks) => ({
    ...album,
    tracks: tracks.map(toTrack),
  }));
