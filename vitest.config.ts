import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./client/src/test-setup.ts'],
    exclude: ['dist/**', 'node_modules/**'],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
