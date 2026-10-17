import { connect } from 'react-redux'
import type { Dispatch } from 'redux'
import type { RootState } from '../../client/redux/reducers'
import type { AppAction, Tab } from '../../client/redux/types'
import Navigation from './Navigation'

const mapState = (state: RootState) => ({
  tab: state.uiState.tab
})
const mapDispatch = (dispatch: Dispatch<AppAction>) => ({
  setTab: (tab: Tab) => dispatch({ type: 'SET_TAB', payload: { tab } })
})

export default connect(mapState, mapDispatch)(Navigation)
