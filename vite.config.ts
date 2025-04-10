import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte()
  ],
  resolve: {
    alias: {
      $lib: path.resolve("./src/lib"),
    },
  },
  build: {
    // Enable build caching for faster rebuilds
    target: 'esnext',
    minify: 'esbuild',
    reportCompressedSize: false,
    rollupOptions: {
      input: {
        popup: 'index.html',
        background: 'src/background.ts',
        content: 'src/content.ts'
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Special case for content script
          if (chunkInfo.name === 'content') {
            return 'content.js';
          }
          return '[name].js';
        },
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    outDir: 'dist',
    emptyOutDir: true
  },
  optimizeDeps: {
    // Improves dev server start
    include: ['@lucide/svelte', 'bits-ui'],
    exclude: []
  }
})
