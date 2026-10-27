import { connect } from 'react-redux';
import type { Dispatch } from 'redux';
import type { Track } from '../../types/library';
import type { RootState } from '../../client/redux/reducers';
import type { AppAction } from '../../client/redux/types';
import NowPlaying from './NowPlaying';

const mapState = (state: RootState) => ({
  port: state.uiState.port,
  streamTitle: state.uiState.streamTitle,
  streamArt: state.uiState.streamArt,
  currentSong: state.uiState.currentSong,
  nowPlaying: state.uiState.nowPlaying,
});

const mapDispatch = (dispatch: Dispatch<AppAction>) => ({
  playTrack: (track: Track) => dispatch({ type: 'FORCE_PLAY_TRACK', payload: { track } }),
});

export default connect(mapState, mapDispatch)(NowPlaying);
