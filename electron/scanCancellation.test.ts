import { describe, expect, it } from 'vitest';
import { cancelScans, quitSignal } from './scanCancellation';

describe('scanCancellation', () => {
  it('aborts the quit signal once the scans are cancelled', () => {
    expect(quitSignal.aborted).toBe(false);

    cancelScans();

    expect(quitSignal.aborted).toBe(true);
  });
});
