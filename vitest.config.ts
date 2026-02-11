import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
  test: {
    globals: true,
    // Muitos testes do projeto (inclusive alguns .test.ts) usam React Testing Library
    // e precisam de um DOM. Por isso, usamos um ambiente com DOM por padrÃ£o.
    environment: 'happy-dom',
    // Setup base + DOM-only helpers (guardados para nÃ£o quebrar caso algum teste rode em node)
    setupFiles: ['test/setup.ts', 'test/setup.dom.ts'],
    // Cobrir testes unitÃ¡rios tanto em /test quanto em components/features
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'dist', 'tmp', '**/*.bak', '**/*.bkp'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
