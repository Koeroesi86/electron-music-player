import { connect } from 'react-redux'
import PlayerHome from './PlayerHome.jsx'

const mapState = state => ({
  loaded: state.library.loaded,
  maximized: state.uiState.maximized,
  folders: state.folders
})
const mapDispatch = dispatch => ({
  /** @param {FileList} fileList */
  addFiles: (fileList) => dispatch({ type: 'FILES_ADDED', payload: { fileList } }),
  setVolume: (volume) => dispatch({ type: 'SET_VOLUME', payload: { volume } }),
  openEqualizer: () => dispatch({ type: 'OPEN_EQUALIZER', payload: {} }),
  playTrack: (track) => dispatch({ type: 'PLAY_TRACK', payload: { track } }),
  trackEnded: () => dispatch({ type: 'TRACK_ENDED', payload: {} }),
  rescanLibrary: () => dispatch({ type: 'RESCAN_LIBRARY', payload: {} }),
  onUnload: () => dispatch({ type: 'SAVE_SETTINGS', payload: {} })
})

export default window
  ? connect(mapState, mapDispatch)(PlayerHome)
  : PlayerHome
