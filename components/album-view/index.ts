import { connect } from 'react-redux'
import type { Dispatch } from 'redux'
import type { Album, Track } from '../../types/library'
import type { RootState } from '../../client/redux/reducers'
import type { AppAction } from '../../client/redux/types'
import AlbumView from './AlbumView'

const mapState = (state: RootState) => ({
  loaded: state.library.loaded,
  albums: state.library.albums
})

const mapDispatch = (dispatch: Dispatch<AppAction>) => ({
  selectAlbum: (album: Album | null) => dispatch({ type: 'SELECT_ALBUM', payload: { album } }),
  playTracks: (tracks: Track[]) => dispatch({ type: 'PLAY_TRACKS', payload: { tracks } })
})

export default connect(mapState, mapDispatch)(AlbumView)
