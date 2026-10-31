import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: {
    alias: [{ find: /^.+\.scss$/, replacement: path.resolve(__dirname, 'test-utils-style-stub.ts') }],
  },
  test: {
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
    coverage: {
      provider: 'v8',
      include: ['electron/**/*.ts', 'locales/**/*.ts', 'client/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'scripts/**/*.js'],
      exclude: ['**/*.test.{ts,tsx}', 'electron/test-database.ts'],
      // just below the current coverage, so it can not drop; raise them as tests are added
      thresholds: { statements: 79, branches: 83, functions: 76, lines: 81 },
      reporter: ['text-summary', 'json-summary', 'lcov'],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'backend',
          environment: 'node',
          include: ['electron/**/*.test.ts', 'locales/**/*.test.ts', 'scripts/**/*.test.js'],
        },
      },
      {
        extends: true,
        test: {
          name: 'frontend',
          environment: 'jsdom',
          setupFiles: ['test-setup-frontend.ts'],
          include: ['client/**/*.test.{ts,tsx}', 'components/**/*.test.{ts,tsx}'],
        },
      },
    ],
  },
});
