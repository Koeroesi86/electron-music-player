import { connect } from 'react-redux';
import type { Dispatch } from 'redux';
import type { NormalizationMode } from '../../client/audio/loudness';
import type { RootState } from '../../client/redux/reducers';
import type { AppAction } from '../../client/redux/types';
import LoudnessNormalization from './LoudnessNormalization';

const mapState = (state: RootState) => ({ mode: state.uiState.normalization });

const mapDispatch = (dispatch: Dispatch<AppAction>) => ({
  setMode: (mode: NormalizationMode) => dispatch({ type: 'SET_NORMALIZATION', payload: { mode } }),
});

export default connect(mapState, mapDispatch)(LoudnessNormalization);
