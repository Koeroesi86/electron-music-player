import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { getAppUserModelId, installerAppId } from './appUserModelId';

describe('getAppUserModelId', () => {
  it('is the installer app ID for a packaged app', () => {
    expect(getAppUserModelId(false, 'production')).toBe('io.github.koeroesi86.Tunelle');
  });

  it('differs from the installer app ID in development', () => {
    expect(getAppUserModelId(true, 'development')).toBe('io.github.koeroesi86.Tunelle-development');
  });

  it('matches the appId the installer is built with', () => {
    const { build } = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8'));

    expect(installerAppId).toBe(build.appId);
  });
});
