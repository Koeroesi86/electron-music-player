import { combineReducers } from 'redux';
import library from './library/reducer';
import folders from './folders/reducer';
import radio from './radio/reducer';
import update from './update/reducer';
import uiState from './uiState/reducer';

const reducers = combineReducers({
  folders,
  library,
  radio,
  uiState,
  update,
});

export type RootState = ReturnType<typeof reducers>;

export default reducers;
