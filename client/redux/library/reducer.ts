import type { Reducer } from 'redux';
import type { AlbumSummary, Track } from '../../../types/library';
import { isAppAction } from '../types';
import { createPageCache, markStale, storePage } from './pages';
import type { PageCache } from './pages';

export interface LibraryState {
  tracks: PageCache<Track>;
  albums: PageCache<AlbumSummary>;
  /** The first page has arrived */
  loaded: boolean;
}

const initialState: LibraryState = {
  tracks: createPageCache(),
  albums: createPageCache(),
  loaded: false,
};

const reducer: Reducer<LibraryState> = (state = initialState, action) => {
  if (!isAppAction(action)) return state;

  switch (action.type) {
    case 'STORE_TRACK_PAGE': {
      const { page, items, total } = action.payload;
      return { ...state, tracks: storePage(state.tracks, page, items, total), loaded: true };
    }
    case 'STORE_ALBUM_PAGE': {
      const { page, items, total } = action.payload;
      return { ...state, albums: storePage(state.albums, page, items, total) };
    }
    // the sort or the folders changed: the pages are of another list, the first one is fetched again
    case 'RESET_LIBRARY':
      return { ...state, [action.payload.kind]: createPageCache() };
    case 'INVALIDATE_LIBRARY':
      return { ...state, tracks: markStale(state.tracks), albums: markStale(state.albums) };
    default:
      return state;
  }
};

export default reducer;
