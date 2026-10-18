import { connect } from 'react-redux';
import type { ConnectedProps } from 'react-redux';
import type { Dispatch } from 'redux';
import type { RootState } from '../../client/redux/reducers';
import type { AppAction } from '../../client/redux/types';
import PlayerControls from './PlayerControls';
import { Audio } from '../../client/audio/context';

const mapState = (state: RootState) => ({
  isPlaying: state.uiState.isPlaying,
  port: state.uiState.port,
  volume: state.uiState.volume,
  shuffle: state.uiState.shuffle,
  repeat: state.uiState.repeat,
  currentTime: state.uiState.currentTime,
  currentSong: state.uiState.currentSong,
});

const mapDispatch = (dispatch: Dispatch<AppAction>) => ({
  setCurrentTime: (currentTime: number) => dispatch({ type: 'SET_CURRENT_TIME', payload: { currentTime } }),
  openEqualizer: () => dispatch({ type: 'SET_TAB', payload: { tab: 'equalizer' } }),
  setPlaying: (isPlaying: boolean) => dispatch({ type: 'SET_PLAYING', payload: { isPlaying } }),
  setVolume: (volume: number | string) => dispatch({ type: 'SET_VOLUME', payload: { volume } }),
  toggleRepeat: () => dispatch({ type: 'TOGGLE_REPEAT', payload: {} }),
  toggleShuffle: () => dispatch({ type: 'TOGGLE_SHUFFLE', payload: {} }),
  nextSong: () => dispatch({ type: 'NEXT_SONG', payload: {} }),
  previousSong: () => dispatch({ type: 'PREVIOUS_SONG', payload: {} }),
});

const connector = connect(mapState, mapDispatch);

const ContextualPlayerControls = (props: ConnectedProps<typeof connector>) => (
  <Audio.Consumer>
    {({ addPlayStatusListener, play, pause, seek, addTimeChangeListener }) => (
      <PlayerControls
        {...props}
        play={play}
        pause={pause}
        addPlayStatusListener={addPlayStatusListener}
        addTimeChangeListener={addTimeChangeListener}
        seek={seek}
      />
    )}
  </Audio.Consumer>
);

export default connector(ContextualPlayerControls);
