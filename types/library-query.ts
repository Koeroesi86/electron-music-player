/** The fields the tracks can be sorted by; a sort from outside is checked against these and never put into a query as it is */
export const trackSortFields = ['title', 'artist', 'album', 'year', 'duration', 'track'] as const;

/** The fields the albums can be sorted by, artist and year are the ones of the first track of the album */
export const albumSortFields = ['title', 'artist', 'year', 'trackCount', 'duration'] as const;

export const sortDirections = ['asc', 'desc'] as const;

export type TrackSortField = (typeof trackSortFields)[number];
export type AlbumSortField = (typeof albumSortFields)[number];
export type SortDirection = (typeof sortDirections)[number];

export interface Sort<F extends string> {
  field: F;
  direction: SortDirection;
}

export type TrackSort = Sort<TrackSortField>;
export type AlbumSort = Sort<AlbumSortField>;

/** What a window of the library is asked for: a sort (undefined is the default order), the library folders to limit it to (none is all of them) and the text to find (none is everything) */
export interface LibraryQuery<S> {
  sort: S | undefined;
  folders: string[];
  /** Matched in the artist, the album and the title, without case and accents */
  search?: string;
}

const findOf = <T extends string>(allowed: readonly T[], value: unknown) => allowed.find((item) => item === value);

const parseSort = <F extends string>(fields: readonly F[], field: unknown, direction: unknown): Sort<F> | undefined => {
  const parsedField = findOf(fields, field);
  const parsedDirection = findOf(sortDirections, direction);

  return parsedField && parsedDirection ? { field: parsedField, direction: parsedDirection } : undefined;
};

const fromObject = (value: unknown) => (typeof value === 'object' && value !== null ? value : {});

const parseSortObject = <F extends string>(fields: readonly F[], value: unknown) => {
  const { field, direction } = { field: undefined, direction: undefined, ...fromObject(value) };

  return parseSort(fields, field, direction);
};

/** A saved or requested track sort, undefined for anything that is not a known field with a known direction */
export const parseTrackSort = (field: unknown, direction: unknown) => parseSort(trackSortFields, field, direction);

export const parseAlbumSort = (field: unknown, direction: unknown) => parseSort(albumSortFields, field, direction);

export const restoreTrackSort = (value: unknown) => parseSortObject(trackSortFields, value);

export const restoreAlbumSort = (value: unknown) => parseSortObject(albumSortFields, value);

/** The folders of a saved or requested selection: the strings in it, once each */
export const parseFolders = (value: unknown): string[] => [
  ...new Set(Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []),
];

/** The sort after a click on a column: ascending, then descending, then back to the default order; another column starts ascending */
export const cycleSort = <F extends string>(current: Sort<F> | undefined, field: F): Sort<F> | undefined => {
  if (current?.field !== field) return { field, direction: 'asc' };

  return current.direction === 'asc' ? { field, direction: 'desc' } : undefined;
};

/** The selected folders that the library still has, a folder that was removed from it is dropped */
export const knownFolders = (selected: string[], known: string[]) => selected.filter((folder) => known.includes(folder));

/** The text of a search, undefined when there is nothing to look for */
export const parseSearch = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);
