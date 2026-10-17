import React from 'react'
import { connect } from 'react-redux'
import PlayerControls from './PlayerControls'
import { Audio } from '../../client/audio/context'

const mapState = (state) => ({
  isPlaying: state.uiState.isPlaying,
  port: state.uiState.port,
  volume: state.uiState.volume,
  shuffle: state.uiState.shuffle,
  repeat: state.uiState.repeat,
  currentTime: state.uiState.currentTime,
  currentSong: state.uiState.currentSong
})

const mapDispatch = (dispatch) => ({
  setCurrentTime: (currentTime) => dispatch({ type: 'SET_CURRENT_TIME', payload: { currentTime } }),
  openEqualizer: () => dispatch({ type: 'SET_TAB', payload: { tab: 'equalizer' } }),
  setPlaying: (isPlaying) => dispatch({ type: 'SET_PLAYING', payload: { isPlaying } }),
  setVolume: (volume) => dispatch({ type: 'SET_VOLUME', payload: { volume } }),
  toggleRepeat: () => dispatch({ type: 'TOGGLE_REPEAT', payload: {} }),
  toggleShuffle: () => dispatch({ type: 'TOGGLE_SHUFFLE', payload: {} }),
  nextSong: () => dispatch({ type: 'NEXT_SONG', payload: {} }),
  previousSong: () => dispatch({ type: 'PREVIOUS_SONG', payload: {} })
})

const ContextualPlayerControls = props => (
  <Audio.Consumer>
    {({ addPlayStatusListener, play, pause, seek, addTimeChangeListener }) =>
      <PlayerControls
        {...props}
        play={play}
        pause={pause}
        addPlayStatusListener={addPlayStatusListener}
        addTimeChangeListener={addTimeChangeListener}
        seek={seek}
      />}
  </Audio.Consumer>
)

export default window
  ? connect(mapState, mapDispatch)(ContextualPlayerControls)
  : PlayerControls
