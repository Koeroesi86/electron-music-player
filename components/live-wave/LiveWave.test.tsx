import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import LiveWave from './LiveWave';

describe('LiveWave', () => {
  const requestAnimationFrame = vi.fn(() => 1);
  const cancelAnimationFrame = vi.fn();
  const stroke = vi.fn();
  let reduceMotion = false;

  beforeEach(() => {
    reduceMotion = false;
    requestAnimationFrame.mockClear();
    cancelAnimationFrame.mockClear();
    stroke.mockClear();
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame);
    vi.stubGlobal('matchMedia', () => ({ matches: reduceMotion }));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => ({ setTransform: vi.fn(), clearRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke }) as unknown as CanvasRenderingContext2D
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('draws the two waves and keeps moving them while it plays', () => {
    render(<LiveWave isPlaying />);

    expect(stroke).toHaveBeenCalledTimes(2);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it('draws one still frame when it does not play', () => {
    render(<LiveWave isPlaying={false} />);

    expect(stroke).toHaveBeenCalledTimes(2);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('stands still when the system asks for less motion', () => {
    reduceMotion = true;
    render(<LiveWave isPlaying />);

    expect(stroke).toHaveBeenCalledTimes(2);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('stops the animation when it goes away', () => {
    render(<LiveWave isPlaying />).unmount();

    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
  });
});
