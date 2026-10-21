import { connect } from 'react-redux';
import type { ConnectedProps } from 'react-redux';
import type { Dispatch } from 'redux';
import type { RootState } from '../../client/redux/reducers';
import type { AppAction } from '../../client/redux/types';
import { Audio } from '../../client/audio/context';
import Equalizer from './Equalizer';

const mapState = (state: RootState) => ({
  gains: state.uiState.equalizer,
});

const mapDispatch = (dispatch: Dispatch<AppAction>) => ({
  setGain: (index: number, value: number | string) => dispatch({ type: 'SET_GAIN', payload: { index, value } }),
});

const connector = connect(mapState, mapDispatch);

const ContextualEqualizer = (props: ConnectedProps<typeof connector>) => (
  <Audio.Consumer>
    {({ connectToSource, createBiquadFilter, connectDestination, onAudioMounted }) => (
      <Equalizer
        {...props}
        connectToSource={connectToSource}
        createBiquadFilter={createBiquadFilter}
        connectDestination={connectDestination}
        onAudioMounted={onAudioMounted}
      />
    )}
  </Audio.Consumer>
);

export default connector(ContextualEqualizer);
