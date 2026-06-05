import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/assets/',
  resolve: {
    alias: {
      '@counterparty-check/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: '.',
    rollupOptions: {
      output: {
        entryFileNames: 'index.js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name][extname]',
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
