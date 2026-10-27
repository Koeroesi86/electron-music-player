import { connect } from 'react-redux';
import type { Dispatch } from 'redux';
import type { Track } from '../../types/library';
import type { RadioStation } from '../../types/radio';
import type { RootState } from '../../client/redux/reducers';
import type { AppAction } from '../../client/redux/types';
import HomeView from './HomeView';

const mapState = (state: RootState) => ({
  history: state.history,
  port: state.uiState.port,
  currentSong: state.uiState.currentSong,
});

const mapDispatch = (dispatch: Dispatch<AppAction>) => ({
  playTracks: (tracks: Track[]) => dispatch({ type: 'PLAY_TRACKS', payload: { tracks } }),
  playStation: (station: RadioStation) => dispatch({ type: 'PLAY_RADIO_STATION', payload: { station } }),
  clearHistory: () => dispatch({ type: 'CLEAR_HISTORY' }),
});

export default connect(mapState, mapDispatch)(HomeView);
