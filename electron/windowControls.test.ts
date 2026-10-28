import { describe, expect, it } from 'vitest';
import { getControlsArguments, getFrameOptions, hasNativeControls, nativeControlsArgument } from './windowControls';

describe('hasNativeControls', () => {
  it('is true on macOS', () => {
    expect(hasNativeControls('darwin')).toBe(true);
  });

  it.each<NodeJS.Platform>(['linux', 'win32'])('is false on %s', (platform) => {
    expect(hasNativeControls(platform)).toBe(false);
  });
});

describe('getControlsArguments', () => {
  it('tells the page about the traffic lights on macOS', () => {
    expect(getControlsArguments('darwin')).toEqual([nativeControlsArgument]);
  });

  it.each<NodeJS.Platform>(['linux', 'win32'])('tells the page nothing on %s', (platform) => {
    expect(getControlsArguments(platform)).toEqual([]);
  });
});

describe('getFrameOptions', () => {
  it('keeps the traffic lights on macOS', () => {
    expect(getFrameOptions('darwin')).toMatchObject({ titleBarStyle: 'hidden', trafficLightPosition: { x: 20, y: 22 } });
    expect(getFrameOptions('darwin')).not.toHaveProperty('frame');
  });

  it.each<NodeJS.Platform>(['linux', 'win32'])('has no frame on %s', (platform) => {
    expect(getFrameOptions(platform)).toEqual({ frame: false });
  });
});
