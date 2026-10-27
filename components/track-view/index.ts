import { connect } from 'react-redux';
import type { Dispatch } from 'redux';
import type { Track } from '../../types/library';
import type { TrackSort } from '../../types/library-query';
import type { RootState } from '../../client/redux/reducers';
import type { AppAction } from '../../client/redux/types';
import TrackView from './TrackView';

const mapState = (state: RootState) => ({
  tracks: state.library.tracks,
  currentSong: state.uiState.currentSong,
  offlineFolders: state.offlineFolders,
  sort: state.uiState.trackSort,
  selected: state.uiState.libraryFolders,
  folders: state.folders,
});

const mapDispatch = (dispatch: Dispatch<AppAction>) => ({
  playTracks: (tracks: Track[]) => dispatch({ type: 'PLAY_TRACKS', payload: { tracks } }),
  loadPage: (page: number) => dispatch({ type: 'LOAD_LIBRARY_PAGE', payload: { kind: 'tracks', page } }),
  setSort: (sort: TrackSort | undefined) => dispatch({ type: 'SET_TRACK_SORT', payload: { sort } }),
});

export default connect(mapState, mapDispatch)(TrackView);
