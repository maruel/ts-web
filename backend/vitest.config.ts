import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: process.platform === 'win32' ? 20000 : 5000,
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['dist', 'node_modules']
    }
  }
});
