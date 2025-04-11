import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from "path";
import fs from 'fs';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    {
      name: 'move-html',
      closeBundle() {
        const srcPath = path.resolve(__dirname, 'dist/src/app/popup.html');
        const destPath = path.resolve(__dirname, 'dist/popup.html');
        if (fs.existsSync(srcPath)) {
          fs.renameSync(srcPath, destPath);
          // Clean up the empty directory
          fs.rmSync(path.resolve(__dirname, 'dist/src/'), { recursive: true, force: true });
        }
      }
    }
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
        popup: 'src/app/popup.html',
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
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'popup.html') {
            return 'popup.html';
          }
          return '[name].[ext]';
        }
      }
    },
    outDir: 'dist',
    emptyOutDir: true,
    copyPublicDir: true
  },
  optimizeDeps: {
    // Improves dev server start
    include: ['@lucide/svelte', 'bits-ui'],
    exclude: []
  }
})
