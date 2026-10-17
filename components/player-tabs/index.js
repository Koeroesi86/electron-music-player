import { connect } from 'react-redux'
import PlayerTabs from './PlayerTabs'

const mapState = state => ({
  tab: state.uiState.tab
})
const mapDispatch = dispatch => ({})

export default window
  ? connect(mapState, mapDispatch)(PlayerTabs)
  : PlayerTabs
