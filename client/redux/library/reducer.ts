import path from 'path';
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
    const { library: tracks, finished } = action.payload;
    const albumsObject: Record<string, Album> = {};
    state.albums.forEach((album) => {
      albumsObject[album.id] = album;
    });
    tracks.forEach((track) => {
      const albumKey = `${path.dirname(track.path)} - ${track.album}`;
      if (track.picture) {
        track.picture = track.picture.replace(/^file:\/\//, '');
      }
      const album = albumsObject[albumKey];
      if (!album) {
        albumsObject[albumKey] = {
          id: albumKey,
          title: track.album,
          path: path.dirname(track.path),
          artist: track.artist,
          cover: track.picture,
          duration: track.duration,
          year: track.year,
          tracks: [track],
        };
      } else {
        const existingTrack = album.tracks.find((t) => track.path === t.path);
        if (!existingTrack) {
          album.tracks.push(track);
          album.duration = (album.duration ?? 0) + (track.duration ?? 0);
        } else {
          album.duration = (album.duration ?? 0) - (existingTrack.duration ?? 0);
          Object.assign(existingTrack, track);
          album.duration += track.duration ?? 0;
        }
      }
    });
    const receivedAlbums = Object.getOwnPropertyNames(albumsObject).map((id) => Object.assign({}, albumsObject[id], { id }));
    return Object.assign({}, state, {
      tracks,
      albums: receivedAlbums,
      loaded: !!finished,
    });
  }

  return state;
};

export default reducer;
