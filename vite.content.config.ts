import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: 'src/content.ts',
      output: {
        entryFileNames: 'content.js',
        format: 'iife',
        name: 'content',
        inlineDynamicImports: true
      }
    },
    outDir: 'dist',
    emptyOutDir: false
  }
}) 