import ScanProgress from './ScanProgress'
import { connect } from 'react-redux'

const mapState = state => ({
  current: state.uiState.progress,
  total: state.uiState.totalCount,
  scanningFolder: state.uiState.scanningFolder
})
const mapDispatch = dispatch => ({})

export default window
  ? connect(mapState, mapDispatch)(ScanProgress)
  : ScanProgress
