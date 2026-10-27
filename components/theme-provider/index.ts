import { connect } from 'react-redux';
import type { RootState } from '../../client/redux/reducers';
import ThemeProvider from './ThemeProvider';

const mapState = (state: RootState) => ({ theme: state.uiState.theme });

export default connect(mapState)(ThemeProvider);
