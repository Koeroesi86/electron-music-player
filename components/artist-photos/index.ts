import { connect } from 'react-redux';
import type { Dispatch } from 'redux';
import type { RootState } from '../../client/redux/reducers';
import type { AppAction } from '../../client/redux/types';
import ArtistPhotos from './ArtistPhotos';

const mapState = ({ uiState }: RootState) => ({ enabled: uiState.artistPhotos });

const mapDispatch = (dispatch: Dispatch<AppAction>) => ({
  setEnabled: (enabled: boolean) => dispatch({ type: 'SET_ARTIST_PHOTOS', payload: { enabled } }),
});

export default connect(mapState, mapDispatch)(ArtistPhotos);
