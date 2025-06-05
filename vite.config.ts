import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import path from "path";
import fs from "fs";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte({
      compilerOptions: {
        dev: process.env.NODE_ENV === "development",
      },
    }),
    {
      name: "move-html",
      closeBundle() {
        // Try multiple possible locations for the HTML file
        const possiblePaths = [
          "dist/src/popup/popup.html",
          "dist-firefox/src/popup/popup.html",
        ];

        const destPaths = ["dist/popup.html", "dist-firefox/popup.html"];

        possiblePaths.forEach((srcPath, index) => {
          const fullSrcPath = path.resolve(__dirname, srcPath);
          const fullDestPath = path.resolve(__dirname, destPaths[index]);

          if (fs.existsSync(fullSrcPath)) {
            fs.renameSync(fullSrcPath, fullDestPath);

            // Clean up the empty directory
            const srcDir = path.dirname(fullSrcPath);
            try {
              if (fs.existsSync(srcDir)) {
                fs.rmSync(path.resolve(__dirname, path.dirname(srcPath)), {
                  recursive: true,
                  force: true,
                });
              }
            } catch (e) {
              // Ignore cleanup errors
            }
          }
        });
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
    target: "esnext",
    minify: "esbuild",
    reportCompressedSize: false,
    lib: {
      entry: "src/popup/popup.html", // This will be overridden per build
      formats: ["iife"],
      name: "ExtensionBundle",
    },
    rollupOptions: {
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
      },
    },
    outDir: "dist",
    emptyOutDir: false, // We'll handle cleanup in build script
    copyPublicDir: false, // We'll handle this in build script
  },
  optimizeDeps: {
    // Improves dev server start
    include: ["@lucide/svelte", "bits-ui"],
    exclude: [],
  },
});
