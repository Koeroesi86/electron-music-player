import { connect } from 'react-redux';
import type { Dispatch } from 'redux';
import type { Track } from '../../types/library';
import type { AppAction } from '../../client/redux/types';
import AddToQueue from './AddToQueue';

const mapDispatch = (dispatch: Dispatch<AppAction>) => ({
  add: (tracks: Track[]) => dispatch({ type: 'ADD_TO_QUEUE', payload: { tracks } }),
});

export default connect(undefined, mapDispatch)(AddToQueue);
