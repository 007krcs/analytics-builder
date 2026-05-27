import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // .ts only — the package owns adding .tsx component tests separately.
    include: ['packages/*/src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    environment: 'node',
    // React hook tests need a DOM
    environmentMatchGlobs: [
      ['packages/react/**', 'happy-dom'],
    ],
    reporters: ['default'],
  },
});
