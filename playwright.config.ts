import { defineConfig } from '@playwright/test';

// the tests start the built app (npm run build first) and listen to its audio, see e2e/app.ts
export default defineConfig({
  testDir: 'e2e',
  testMatch: '*.spec.ts',
  // one app at a time: a window per test, and the audio is measured against a clock that a second app would load
  workers: 1,
  fullyParallel: false,
  // a retry would hide the test that fails now and then
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [['github'], ['list'], ['html', { open: 'never' }]] : [['list']],
  use: { trace: 'retain-on-failure' },
});
