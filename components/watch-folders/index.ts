import { connect } from 'react-redux';
import type { Dispatch } from 'redux';
import type { RootState } from '../../client/redux/reducers';
import type { AppAction } from '../../client/redux/types';
import WatchFolders from './WatchFolders';

const mapState = ({ uiState }: RootState) => ({ enabled: uiState.watchFolders });

const mapDispatch = (dispatch: Dispatch<AppAction>) => ({
  setEnabled: (enabled: boolean) => dispatch({ type: 'SET_WATCH_FOLDERS', payload: { enabled } }),
});

export default connect(mapState, mapDispatch)(WatchFolders);
