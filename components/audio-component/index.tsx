import { connect } from 'react-redux';
import type { ConnectedProps } from 'react-redux';
import type { Dispatch } from 'redux';
import type { RootState } from '../../client/redux/reducers';
import type { AppAction } from '../../client/redux/types';
import AudioComponent from './AudioComponent';
import { Audio } from '../../client/audio/context';

const mapState = (state: RootState) => ({
  currentSong: state.uiState.currentSong,
  volume: state.uiState.volume,
  port: state.uiState.port,
});

const mapDispatch = (dispatch: Dispatch<AppAction>) => ({
  trackEnded: () => dispatch({ type: 'TRACK_ENDED', payload: {} }),
});

const connector = connect(mapState, mapDispatch);

const ContextualAudioComponent = (props: ConnectedProps<typeof connector>) => (
  <Audio.Consumer>{({ connectNode }) => <AudioComponent {...props} connectNode={connectNode} />}</Audio.Consumer>
);

export default connector(ContextualAudioComponent);
