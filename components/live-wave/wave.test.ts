import { describe, expect, it } from 'vitest';
import { waveLayers, waveOffset } from './wave';

describe('waveOffset', () => {
  it.each(waveLayers)('keeps a layer within a fifth of the height from the middle line', (layer) => {
    const offsets = Array.from({ length: 400 }, (_, index) => waveOffset(layer, index * 2, index / 10, 25));

    expect(Math.max(...offsets.map(Math.abs))).toBeLessThanOrEqual(25 * 0.2 * layer.amplitude);
  });

  it('moves with the time', () => {
    const [layer] = waveLayers;

    expect(waveOffset(layer, 40, 0, 25)).not.toBe(waveOffset(layer, 40, 1, 25));
  });
});
