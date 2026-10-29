import { describe, expect, it } from 'vitest';
import { formatLength } from './format-length';

describe('formatLength', () => {
  it('writes minutes and seconds, with the hours only when there are any', () => {
    expect(formatLength(2892)).toBe('48:12');
    expect(formatLength(61)).toBe('1:01');
    expect(formatLength(3723)).toBe('1:02:03');
  });

  it('writes zero for what is not a length', () => {
    expect(formatLength(null)).toBe('0:00');
    expect(formatLength(undefined)).toBe('0:00');
    expect(formatLength('soon')).toBe('0:00');
    expect(formatLength(-5)).toBe('0:00');
  });

  it('reads a length written as text and drops the fraction', () => {
    expect(formatLength('125.9')).toBe('2:05');
  });
});
