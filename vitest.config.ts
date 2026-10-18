import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: {
    alias: [{ find: /^.+\.scss$/, replacement: path.resolve(__dirname, 'test-utils-style-stub.ts') }]
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'backend',
          environment: 'node',
          include: ['electron/**/*.test.ts']
        }
      },
      {
        extends: true,
        test: {
          name: 'frontend',
          environment: 'jsdom',
          include: ['client/**/*.test.{ts,tsx}', 'components/**/*.test.{ts,tsx}']
        }
      }
    ]
  }
})
