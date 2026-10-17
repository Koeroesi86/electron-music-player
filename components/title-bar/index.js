import TitleBar from './TitleBar'
import { connect } from 'react-redux'

const mapState = state => ({})

const mapDispatch = dispatch => ({
  close: () => dispatch({ type: 'CLOSE_APP', payload: {} }),
  minimize: () => dispatch({ type: 'MINIMIZE_APP', payload: {} }),
  maximize: () => dispatch({ type: 'MAXIMIZE_APP', payload: {} })
})

export default window
  ? connect(
      mapState,
      mapDispatch
    )(TitleBar)
  : TitleBar
