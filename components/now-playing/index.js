import { connect } from 'react-redux'
import NowPlaying from './NowPlaying'

const mapState = state => ({
  port: state.uiState.port,
  currentSong: state.uiState.currentSong,
  nowPlaying: state.uiState.nowPlaying
})

const mapDispatch = dispatch => ({
  playTrack: (track) => dispatch({ type: 'FORCE_PLAY_TRACK', payload: { track } })
})

export default window
  ? connect(mapState, mapDispatch)(NowPlaying)
  : NowPlaying
