import LocalCollection from './LocalCollection'
import { connect } from 'react-redux'

const mapState = state => ({
  view: state.uiState.view,
  tracks: state.library.tracks,
  scanningFolder: state.uiState.scanningFolder
})
const mapDispatch = dispatch => ({
  setView: (view) => dispatch({ type: 'SET_VIEW', payload: { view } }),
  rescanLibrary: () => dispatch({ type: 'RESCAN_LIBRARY', payload: {} })
})

export default window
  ? connect(mapState, mapDispatch)(LocalCollection)
  : LocalCollection
