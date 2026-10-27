import { connect } from 'react-redux';
import type { Dispatch } from 'redux';
import type { RootState } from '../../client/redux/reducers';
import type { AppAction } from '../../client/redux/types';
import FolderFilter from './FolderFilter';

const mapState = (state: RootState) => ({ folders: state.folders, selected: state.uiState.libraryFolders });

const mapDispatch = (dispatch: Dispatch<AppAction>) => ({
  setSelected: (folders: string[]) => dispatch({ type: 'SET_LIBRARY_FOLDERS', payload: { folders } }),
});

export default connect(mapState, mapDispatch)(FolderFilter);
