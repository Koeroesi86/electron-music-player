import { describe, expect, it } from 'vitest';
import reducer from './reducer';

describe('offline folders reducer', () => {
  it('starts empty', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual([]);
  });

  it('stores the received folders', () => {
    expect(reducer([], { type: 'OFFLINE_FOLDERS', payload: { folders: ['/mnt/usb'] } })).toEqual(['/mnt/usb']);
  });

  it('keeps the same list when the answer did not change', () => {
    const state = ['/mnt/usb'];

    expect(reducer(state, { type: 'OFFLINE_FOLDERS', payload: { folders: ['/mnt/usb'] } })).toBe(state);
  });

  it('ignores unrelated actions', () => {
    const state = ['/mnt/usb'];

    expect(reducer(state, { type: 'SET_VOLUME', payload: { volume: 1 } })).toBe(state);
  });
});
