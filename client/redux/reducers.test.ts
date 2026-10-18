import { describe, expect, it } from 'vitest'
import reducers from './reducers'

describe('root reducer', () => {
  it('composes folders, library and uiState', () => {
    expect(Object.keys(reducers(undefined, { type: '@@INIT' })).sort()).toEqual(['folders', 'library', 'uiState'])
  })
})
