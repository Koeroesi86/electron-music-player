import { connect } from 'react-redux';
import type { RootState } from '../../client/redux/reducers';
import ScanProgress from './ScanProgress';

const mapState = (state: RootState) => ({
  current: state.uiState.progress,
  total: state.uiState.totalCount,
  scanningFolder: state.uiState.scanningFolder,
});

export default connect(mapState)(ScanProgress);
