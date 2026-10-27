import { connect } from 'react-redux';
import type { RootState } from '../../client/redux/reducers';
import AlbumViewThumbnail from './AlbumViewThumbnail';

const mapState = (state: RootState) => ({
  offlineFolders: state.offlineFolders,
});

export default connect(mapState)(AlbumViewThumbnail);
