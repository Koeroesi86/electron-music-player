import TrackView from './TrackView'
import { connect } from 'react-redux'

const mapState = state => ({
  loaded: state.library.loaded,
  tracks: state.library.tracks,
  currentSong: state.uiState.currentSong
})

const mapDispatch = dispatch => ({
  playTracks: (tracks) => dispatch({ type: 'PLAY_TRACKS', payload: { tracks } })
})

export default window
  ? connect(
      mapState,
      mapDispatch
    )(TrackView)
  : TrackView
