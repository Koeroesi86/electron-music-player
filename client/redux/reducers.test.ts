import { describe, expect, it } from 'vitest';
import reducers from './reducers';

describe('root reducer', () => {
  it('composes favourites, folders, history, library, radio, uiState and update', () => {
    expect(Object.keys(reducers(undefined, { type: '@@INIT' })).sort()).toEqual(['favourites', 'folders', 'history', 'library', 'radio', 'uiState', 'update']);
  });
});
