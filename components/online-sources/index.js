import OnlineSources from './OnlineSources'
import { connect } from 'react-redux'

const mapState = state => ({
  view: state.uiState.onlineView
})
const mapDispatch = dispatch => ({
  setView: (view) => dispatch({ type: 'SET_ONLINE_VIEW', payload: { view } })
})

export default window
  ? connect(mapState, mapDispatch)(OnlineSources)
  : OnlineSources
