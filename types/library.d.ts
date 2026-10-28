/** What a file is encoded as; a row from before the format was read, or a stream that does not tell, has none. The flags are 0 or 1 as the library stores them. */
export interface AudioFormat {
  codec: string | null;
  bitDepth: number | null;
  sampleRate: number | null;
  /** Bits per second */
  bitrate: number | null;
  vbr: number | null;
  lossless: number | null;
}

export interface Track extends Partial<AudioFormat> {
  path: string;
  artist: string;
  album: string;
  title: string;
  year: string | number;
  track: string | number;
  disk: string | number;
  genre: string;
  picture: string | null;
  duration: number | null;
}

export interface Album {
  id: string;
  title: string;
  path: string;
  artist: string;
  cover: string | null;
  duration: number | null;
  year: string | number;
  tracks: Track[];
}

/** An album as listed in a window of the library, its tracks are fetched when the album is opened or played */
export interface AlbumSummary extends Omit<Album, 'tracks'> {
  trackCount: number;
}

/** One page of a list, together with the length of the whole list */
export interface LibraryPage<T> {
  items: T[];
  total: number;
}

export interface Folder {
  path: string;
  lastModified: number;
}

export interface Query {
  query: string;
  variables: unknown[];
}
