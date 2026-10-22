import { combineReducers } from 'redux';
import library from './library/reducer';
import folders from './folders/reducer';
import radio from './radio/reducer';
import uiState from './uiState/reducer';

const reducers = combineReducers({
  folders,
  library,
  radio,
  uiState,
});

export type RootState = ReturnType<typeof reducers>;

export default reducers;
