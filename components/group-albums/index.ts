import { connect } from 'react-redux';
import type { Dispatch } from 'redux';
import type { Album, Track } from '../../types/library';
import type { RootState } from '../../client/redux/reducers';
import type { AppAction } from '../../client/redux/types';
import AlbumView from '../album-view/AlbumView';

/** The albums of the open artist, album artist or genre: the list of the albums, fetched for the group */
const mapState = (state: RootState) => ({
  albums: state.library.groupAlbums,
  sort: state.uiState.albumSort,
  selected: state.uiState.libraryFolders,
  folders: state.folders,
});

const mapDispatch = (dispatch: Dispatch<AppAction>) => ({
  selectAlbum: (album: Album | null) => dispatch({ type: 'SELECT_ALBUM', payload: { album } }),
  playTracks: (tracks: Track[]) => dispatch({ type: 'PLAY_TRACKS', payload: { tracks } }),
  loadPage: (page: number) => dispatch({ type: 'LOAD_LIBRARY_PAGE', payload: { kind: 'groupAlbums', page } }),
});

export default connect(mapState, mapDispatch)(AlbumView);
