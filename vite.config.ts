/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  // Relative base so the static build works from any path (subdirectory,
  // GitHub Pages, or a plain file server) — the app is fully client-side.
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('codemirror') ||
              id.includes('@uiw') ||
              id.includes('@lezer')
            ) {
              return 'codemirror';
            }
            if (id.includes('react')) return 'react';
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['test/**/*.{test,spec}.ts', 'test/**/*.{test,spec}.tsx'],
  },
});
