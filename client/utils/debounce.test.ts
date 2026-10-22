import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounce } from './debounce';

describe('debounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('runs once with the last arguments after the calls stopped', () => {
    const callback = vi.fn();
    const debounced = debounce(callback, 50);

    debounced(1);
    vi.advanceTimersByTime(40);
    debounced(2);
    vi.advanceTimersByTime(40);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(10);
    expect(callback).toHaveBeenCalledExactlyOnceWith(2);
  });

  it('does not run after it is cancelled', () => {
    const callback = vi.fn();
    const debounced = debounce(callback, 50);

    debounced();
    debounced.cancel();
    vi.advanceTimersByTime(100);

    expect(callback).not.toHaveBeenCalled();
  });
});
