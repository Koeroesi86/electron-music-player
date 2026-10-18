import { connect } from 'react-redux';
import type { Dispatch } from 'redux';
import type { Track } from '../../types/library';
import type { RootState } from '../../client/redux/reducers';
import type { AppAction } from '../../client/redux/types';
import TrackView from './TrackView';

const mapState = (state: RootState) => ({
  loaded: state.library.loaded,
  tracks: state.library.tracks,
  currentSong: state.uiState.currentSong,
});

const mapDispatch = (dispatch: Dispatch<AppAction>) => ({
  playTracks: (tracks: Track[]) => dispatch({ type: 'PLAY_TRACKS', payload: { tracks } }),
});

export default connect(mapState, mapDispatch)(TrackView);
