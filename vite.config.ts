import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import path from "path";
import fs from "fs";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    {
      name: "move-html",
      closeBundle() {
        const srcPath = path.resolve(__dirname, "dist/src/popup/popup.html");
        const destPath = path.resolve(__dirname, "dist/popup.html");
        if (fs.existsSync(srcPath)) {
          fs.renameSync(srcPath, destPath);
          // Clean up the empty directory
          fs.rmSync(path.resolve(__dirname, "dist/src/"), {
            recursive: true,
            force: true,
          });
        }
      },
    },
  ],
  resolve: {
    alias: {
      // Legacy alias for backward compatibility
      $lib: path.resolve("./src/system/lib"),

      // New comprehensive aliases
      $core: path.resolve("./src/core"),
      $system: path.resolve("./src/system"),
      $features: path.resolve("./src/features"),
      $utils: path.resolve("./src/utils"),
      $popup: path.resolve("./src/popup"),
      $themes: path.resolve("./src/themes"),

      // System sub-aliases
      "$system/lib": path.resolve("./src/system/lib"),
      "$system/api": path.resolve("./src/system/api"),
      "$system/auth": path.resolve("./src/system/auth"),
      "$system/components": path.resolve("./src/system/components"),

      // Utils sub-aliases
      "$utils/ui": path.resolve("./src/utils/ui"),
      "$utils/data": path.resolve("./src/utils/data"),
      "$utils/common": path.resolve("./src/utils/common"),
    },
  },
  build: {
    // Enable build caching for faster rebuilds
    target: "esnext",
    minify: "esbuild",
    reportCompressedSize: false,
    rollupOptions: {
      input: {
        popup: "src/popup/popup.html",
        background: "src/core/background.ts",
        content: "src/core/content.ts",
      },
      output: {
        // Ensure each entry point maintains its own scope without creating shared chunks
        inlineDynamicImports: true,
        manualChunks: () => null, // Prevents code-splitting
        entryFileNames: (chunkInfo) => {
          // Special case for content script
          if (chunkInfo.name === "content") {
            return "content.js";
          }
          return "[name].js";
        },
        chunkFileNames: "[name].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === "popup.html") {
            return "popup.html";
          }
          return "[name].[ext]";
        },
      },
    },
    outDir: "dist",
    emptyOutDir: true,
    copyPublicDir: true,
  },
  optimizeDeps: {
    // Improves dev server start
    include: ["@lucide/svelte", "bits-ui"],
    exclude: [],
  },
});
