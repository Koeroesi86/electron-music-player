import { connect } from 'react-redux';
import type { Dispatch } from 'redux';
import type { AppAction } from '../../client/redux/types';
import TitleBar from './TitleBar';

const mapDispatch = (dispatch: Dispatch<AppAction>) => ({
  close: () => dispatch({ type: 'CLOSE_APP', payload: {} }),
  minimize: () => dispatch({ type: 'MINIMIZE_APP', payload: {} }),
  maximize: () => dispatch({ type: 'MAXIMIZE_APP', payload: {} }),
});

export default connect(null, mapDispatch)(TitleBar);
