import { connect } from 'react-redux'
import type { RootState } from '../../client/redux/reducers'
import FolderManagement from './FolderManagement'

const mapState = (state: RootState) => ({
  folders: state.folders
})

export default connect(mapState)(FolderManagement)
