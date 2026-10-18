import { connect } from 'react-redux';
import type { Dispatch } from 'redux';
import type { RootState } from '../../client/redux/reducers';
import type { AppAction, OnlineView } from '../../client/redux/types';
import OnlineSources from './OnlineSources';

const mapState = (state: RootState) => ({
  view: state.uiState.onlineView,
});
const mapDispatch = (dispatch: Dispatch<AppAction>) => ({
  setView: (view: OnlineView) => dispatch({ type: 'SET_ONLINE_VIEW', payload: { view } }),
});

export default connect(mapState, mapDispatch)(OnlineSources);
