import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'expo-secure-store': resolve(__dirname, './src/test/expo-secure-store.mock.ts'),
    },
  },
  test: {
    environment: 'node',
  },
});
