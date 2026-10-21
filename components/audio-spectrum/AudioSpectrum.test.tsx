import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import AudioSpectrum from './AudioSpectrum';

describe('AudioSpectrum', () => {
  let frame = 0;
  const cancelAnimationFrame = vi.fn();

  beforeEach(() => {
    frame = 0;
    cancelAnimationFrame.mockReset();
    vi.stubGlobal('requestAnimationFrame', () => ++frame);
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => ({ createLinearGradient: () => ({ addColorStop: vi.fn() }), clearRect: vi.fn(), fillRect: vi.fn() }) as unknown as CanvasRenderingContext2D
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('stops the running animation before it starts another', () => {
    let notify: (isPlaying: boolean) => void = () => {};
    render(
      <AudioSpectrum
        createAnalyser={() => false}
        addPlayStatusListener={(listener) => {
          notify = listener;
        }}
      />
    );

    notify(true);
    notify(true);

    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
  });
});
