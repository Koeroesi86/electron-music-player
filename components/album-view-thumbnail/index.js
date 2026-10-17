import AlbumViewThumbnail from './AlbumViewThumbnail'
import { connect } from 'react-redux'

const mapState = state => ({
  port: state.uiState.port
})

const mapDispatch = dispatch => ({})

export default window
  ? connect(mapState, mapDispatch)(AlbumViewThumbnail)
  : AlbumViewThumbnail
