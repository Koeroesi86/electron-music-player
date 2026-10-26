import { describe, expect, it, vi } from 'vitest';
import type { BrowserWindow } from 'electron';
import { applyWindowBackdrop, blurArgument, getBackdropArguments, getWindowBackdrop } from './windowBackdrop';

describe('getWindowBackdrop', () => {
  it('is vibrancy on macOS', () => {
    expect(getWindowBackdrop('darwin', {})).toBe('vibrancy');
  });

  it.each<NodeJS.Platform>(['linux', 'win32'])('is none on %s by default', (platform) => {
    expect(getWindowBackdrop(platform, {})).toBe('none');
  });

  it.each<NodeJS.Platform>(['linux', 'win32'])('is external on %s with EMUSIC_BLUR=1', (platform) => {
    expect(getWindowBackdrop(platform, { EMUSIC_BLUR: '1' })).toBe('external');
  });

  it('only EMUSIC_BLUR=1 turns it on', () => {
    expect(getWindowBackdrop('linux', { EMUSIC_BLUR: '0' })).toBe('none');
  });
});

describe('getBackdropArguments', () => {
  it.each(['vibrancy', 'external'] as const)('tells the page about %s', (backdrop) => {
    expect(getBackdropArguments(backdrop)).toEqual([blurArgument]);
  });

  it('tells the page nothing without a backdrop', () => {
    expect(getBackdropArguments('none')).toEqual([]);
  });
});

describe('applyWindowBackdrop', () => {
  const run = (backdrop: Parameters<typeof applyWindowBackdrop>[1]) => {
    const setVibrancy = vi.fn();
    applyWindowBackdrop({ setVibrancy } as unknown as BrowserWindow, backdrop);
    return setVibrancy;
  };

  it('sets vibrancy for vibrancy', () => {
    expect(run('vibrancy')).toHaveBeenCalledWith('under-window');
  });

  it.each(['external', 'none'] as const)('leaves the window alone for %s', (backdrop) => {
    expect(run(backdrop)).not.toHaveBeenCalled();
  });
});
