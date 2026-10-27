import { connect } from 'react-redux';
import type { Dispatch } from 'redux';
import type { RootState } from '../../client/redux/reducers';
import type { AppAction, Tab } from '../../client/redux/types';
import Navigation from './Navigation';

const mapState = (state: RootState) => ({
  tab: state.uiState.tab,
  playlists: state.playlists,
  playlistId: state.uiState.playlistId,
});
const mapDispatch = (dispatch: Dispatch<AppAction>) => ({
  setTab: (tab: Tab) => dispatch({ type: 'SET_TAB', payload: { tab } }),
  openPlaylist: (id: number) => dispatch({ type: 'OPEN_PLAYLIST', payload: { id } }),
  createPlaylist: (name: string) => dispatch({ type: 'CREATE_PLAYLIST', payload: { name } }),
  movePlaylist: (id: number, toIndex: number) => dispatch({ type: 'MOVE_PLAYLIST', payload: { id, toIndex } }),
});

export default connect(mapState, mapDispatch)(Navigation);
