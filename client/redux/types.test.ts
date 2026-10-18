import { describe, expect, it } from 'vitest'
import { isAppAction } from './types'

describe('isAppAction', () => {
  it('accepts objects with a string type', () => {
    expect(isAppAction({ type: 'SET_TAB' })).toBe(true)
  })

  it.each([undefined, null, 'SET_TAB', 1, {}, { type: 1 }])('rejects %j', value => {
    expect(isAppAction(value)).toBe(false)
  })
})
