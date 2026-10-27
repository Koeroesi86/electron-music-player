import type { Reducer } from 'redux';
import { isAppAction } from '../types';

/** The paths of the library folders that cannot be reached right now */
const reducer: Reducer<string[]> = (state = [], action) => {
  if (!isAppAction(action) || action.type !== 'OFFLINE_FOLDERS') return state;

  const { folders } = action.payload;
  // the check repeats, an unchanged answer keeps the list shown as it is
  return folders.length === state.length && folders.every((folder, index) => folder === state[index]) ? state : folders;
};

export default reducer;
