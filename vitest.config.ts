import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts', 'packages/*/src/**/*.test.tsx'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    setupFiles: ['./vitest.setup.ts'],
    environment: 'node',
    // React hook tests need a DOM
    environmentMatchGlobs: [
      ['packages/react/**', 'happy-dom'],
    ],
    reporters: ['default'],
  },
});
