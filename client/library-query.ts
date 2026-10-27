import type { Folder } from '../types/library';
import type { AlbumSort, LibraryQuery, TrackSort } from '../types/library-query';
import { knownFolders } from '../types/library-query';
import type { RootState } from './redux/reducers';

type QueryState = Pick<RootState, 'folders' | 'uiState'>;

/** The selected folders that the library still has */
export const selectedFolders = (selected: string[], folders: Folder[]) =>
  knownFolders(
    selected,
    folders.map(({ path }) => path)
  );

/** What the tracks are asked for: the sort and the selected folders the library still has */
export const selectTrackQuery = (state: QueryState): LibraryQuery<TrackSort> => ({
  sort: state.uiState.trackSort,
  folders: selectedFolders(state.uiState.libraryFolders, state.folders),
});

export const selectAlbumQuery = (state: QueryState): LibraryQuery<AlbumSort> => ({
  sort: state.uiState.albumSort,
  folders: selectedFolders(state.uiState.libraryFolders, state.folders),
});
