export interface Track {
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

export interface Folder {
  path: string;
  lastModified: number;
}

export interface Query {
  query: string;
  variables: unknown[];
}
