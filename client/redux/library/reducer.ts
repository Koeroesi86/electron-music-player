import { dirname } from 'path';
import type { Reducer } from 'redux';
import type { Album, Track } from '../../../types/library';
import { isAppAction } from '../types';

export interface LibraryState {
  tracks: Track[];
  albums: Album[];
  loaded: boolean;
}

const initialState: LibraryState = {
  tracks: [],
  albums: [],
  loaded: false,
};

const reducer: Reducer<LibraryState> = (state = initialState, action) => {
  if (!isAppAction(action)) return state;

  if (action.type === 'STORE_LIBRARY') {
    const { library, finished } = action.payload;
    // the payload is the whole library, so albums and tracks that are gone from it are gone from the state too
    const tracks = library.map((track) => ({ ...track, picture: track.picture?.replace(/^file:\/\//, '') ?? null }));
    const albums = new Map<string, Album>();
    tracks.forEach((track) => {
      const path = dirname(track.path);
      const id = `${path} - ${track.album}`;
      const album = albums.get(id);
      if (album) {
        album.tracks.push(track);
        album.duration = (album.duration ?? 0) + (track.duration ?? 0);
      } else {
        albums.set(id, {
          id,
          title: track.album,
          path,
          artist: track.artist,
          cover: track.picture,
          duration: track.duration,
          year: track.year,
          tracks: [track],
        });
      }
    });
    return { ...state, tracks, albums: [...albums.values()], loaded: !!finished };
  }

  return state;
};

export default reducer;
