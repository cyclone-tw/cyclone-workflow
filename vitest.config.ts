import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/**/*.test.{ts,tsx}'],
    // Component tests use `// @vitest-environment jsdom` pragma at file top
    // (vitest 4 removed environmentMatchGlobs — pragma is the documented path).
    // jest-dom matchers register globally; safe no-op in node env.
    setupFiles: ['./tests/setup-component.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
