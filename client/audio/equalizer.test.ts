import { describe, expect, it } from 'vitest';
import { bandType, clampGain, defaultGains, equalizerBands, needsSeek, restoreGains } from './equalizer';

describe('equalizer', () => {
  it('uses shelves at the ends and peaking filters between them', () => {
    const types = equalizerBands.map((_, index) => bandType(index));

    expect(types[0]).toBe('lowshelf');
    expect(types[types.length - 1]).toBe('highshelf');
    expect(new Set(types.slice(1, -1))).toEqual(new Set(['peaking']));
  });

  it('clamps gains and ignores values that are not numbers', () => {
    expect([clampGain(20), clampGain(-20), clampGain(3), clampGain(NaN)]).toEqual([12, -12, 3, 0]);
  });

  it('restores only gains that match the bands', () => {
    expect(restoreGains(defaultGains.map(() => 2))).toEqual(defaultGains.map(() => 2));
    expect(restoreGains([1, 2])).toBe(defaultGains);
    expect(restoreGains(undefined)).toBe(defaultGains);
  });

  it('does not seek for the drift between two clock ticks but does for a real seek', () => {
    expect(needsSeek(10.0004, 10)).toBe(false);
    expect(needsSeek(10, 42)).toBe(true);
  });
});
