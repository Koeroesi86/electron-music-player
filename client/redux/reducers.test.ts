import { describe, expect, it } from 'vitest';
import reducers from './reducers';

describe('root reducer', () => {
  it('composes folders, library, radio, uiState and update', () => {
    expect(Object.keys(reducers(undefined, { type: '@@INIT' })).sort()).toEqual(['folders', 'library', 'radio', 'uiState', 'update']);
  });
});
