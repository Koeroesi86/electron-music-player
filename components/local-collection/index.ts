import { connect } from 'react-redux'
import type { Dispatch } from 'redux'
import type { RootState } from '../../client/redux/reducers'
import type { AppAction, LibraryView } from '../../client/redux/types'
import LocalCollection from './LocalCollection'

const mapState = (state: RootState) => ({
  view: state.uiState.view,
  scanningFolder: state.uiState.scanningFolder
})
const mapDispatch = (dispatch: Dispatch<AppAction>) => ({
  setView: (view: LibraryView) => dispatch({ type: 'SET_VIEW', payload: { view } }),
  rescanLibrary: () => dispatch({ type: 'RESCAN_LIBRARY', payload: {} })
})

export default connect(mapState, mapDispatch)(LocalCollection)
