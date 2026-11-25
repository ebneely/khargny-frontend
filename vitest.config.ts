import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/** Vitest resolves the same aliases TypeScript does, so a test can import the app's modules. */
export default defineConfig({
  resolve: {
    alias: [
      { find: '@5argny/core', replacement: fileURLToPath(new URL('./src/5argny', import.meta.url)) },
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
    ],
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
