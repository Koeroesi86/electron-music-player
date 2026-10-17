import AlbumDetails from './AlbumDetails'
import { connect } from 'react-redux'

const mapState = state => ({
  port: state.uiState.port,
  album: state.uiState.selectedAlbum
})

const mapDispatch = dispatch => ({
  playTracks: (tracks) => dispatch({ type: 'PLAY_TRACKS', payload: { tracks } }),
  close: () => dispatch({ type: 'SELECT_ALBUM', payload: { album: null } })
})

export default window
  ? connect(mapState, mapDispatch)(AlbumDetails)
  : AlbumDetails
