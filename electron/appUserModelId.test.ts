import { describe, expect, it } from 'vitest';
import { getAppUserModelId } from './appUserModelId';

describe('getAppUserModelId', () => {
  it('is the installer app ID for a packaged app', () => {
    expect(getAppUserModelId('io.github.koeroesi86.eMusic', false, 'production')).toBe('io.github.koeroesi86.eMusic');
  });

  it('differs from the installer app ID in development', () => {
    expect(getAppUserModelId('io.github.koeroesi86.eMusic', true, 'development')).toBe('io.github.koeroesi86.eMusic-development');
  });
});
