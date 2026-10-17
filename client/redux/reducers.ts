import { combineReducers } from 'redux'
import library from './library/reducer'
import folders from './folders/reducer'
import uiState from './uiState/reducer'

const reducers = combineReducers({
  folders,
  library,
  uiState
})

export type RootState = ReturnType<typeof reducers>

export default reducers
