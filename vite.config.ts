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
        background: 'src/background.ts'
        // content.ts is built separately with Rollup
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    outDir: 'dist',
    emptyOutDir: false // Don't empty the output directory to preserve content.js
  },
  optimizeDeps: {
    // Improves dev server start
    include: ['@lucide/svelte', 'bits-ui'],
    exclude: []
  }
})
