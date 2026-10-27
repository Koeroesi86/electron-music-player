import type { Track } from '../types/library';

/** The value to sort a text by: without case, accents and the space around it, so `Ékes` sorts among the `E` */
export const toSortKey = (value: string | null | undefined) => (value ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

/** The sort keys of the columns that are sorted as text, in the order of the columns title_key, artist_key, album_key */
export const toSortKeys = ({ title, artist, album }: Pick<Track, 'title' | 'artist' | 'album'>) => [toSortKey(title), toSortKey(artist), toSortKey(album)];
