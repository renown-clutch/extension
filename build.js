import { build } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if we're in watch mode
const isWatch = process.argv.includes('--watch');

// Define entry points
const entryPoints = [
  { 
    name: 'popup', 
    input: { popup: 'src/popup/popup.html' },
    outputPath: 'dist'
  },
  { 
    name: 'background', 
    input: { background: 'src/background.ts' },
    outputPath: 'dist'
  },
  { 
    name: 'content', 
    input: { content: 'src/content.ts' },
    outputPath: 'dist'
  }
];

// Prepare dist directory
try {
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  fs.mkdirSync('dist');
} catch (e) {
  console.error('Error preparing dist directory:', e);
}

// Copy theme CSS files
function copyThemeFiles() {
  console.log('Copying theme files...');
  
  const themesDir = resolve(__dirname, 'dist/themes');
  if (!fs.existsSync(themesDir)) {
    fs.mkdirSync(themesDir, { recursive: true });
  }
  
  // Copy Dark theme CSS
  const darkSrcPath = resolve(__dirname, 'src/themes/DarkSheet.css');
  const darkDestPath = resolve(themesDir, 'DarkSheet.css');
  if (fs.existsSync(darkSrcPath)) {
    fs.copyFileSync(darkSrcPath, darkDestPath);
    console.log('Copied DarkSheet.css');
  } else {
    console.warn('DarkSheet.css not found at', darkSrcPath);
  }
  
  // Copy Light theme CSS
  const lightSrcPath = resolve(__dirname, 'src/themes/LightSheet.css');
  const lightDestPath = resolve(themesDir, 'LightSheet.css');
  if (fs.existsSync(lightSrcPath)) {
    fs.copyFileSync(lightSrcPath, lightDestPath);
    console.log('Copied LightSheet.css');
  } else {
    console.warn('LightSheet.css not found at', lightSrcPath);
  }
}

// Build each entry point
async function buildEntries() {
  // Copy public files first
  if (fs.existsSync('public')) {
    fs.cpSync('public', 'dist', { recursive: true });
  }
  
  // Copy theme files
  copyThemeFiles();

  for (const entry of entryPoints) {
    console.log(`Building ${entry.name}...`);
    
    await build({
      configFile: false,
      root: '.',
      plugins: [
        svelte(),
        {
          name: 'move-html',
          closeBundle() {
            if (entry.name === 'popup') {
              const srcPath = resolve(__dirname, 'dist/src/popup/popup.html');
              const destPath = resolve(__dirname, 'dist/popup.html');
              if (fs.existsSync(srcPath)) {
                fs.renameSync(srcPath, destPath);
                // Clean up the empty directory
                try {
                  fs.rmSync(resolve(__dirname, 'dist/src/'), { recursive: true, force: true });
                } catch (e) {
                  console.error('Error cleaning up src directory:', e);
                }
              }
            }
          }
        }
      ],
      resolve: {
        alias: {
          $lib: resolve(__dirname, './src/lib'),
        },
      },
      build: {
        watch: isWatch ? {} : null,
        target: 'esnext',
        minify: 'esbuild',
        emptyOutDir: false,
        copyPublicDir: false,
        rollupOptions: {
          input: entry.input,
          output: {
            inlineDynamicImports: true,
            dir: entry.outputPath,
            entryFileNames: entry.name === 'content' ? 'content.js' : '[name].js',
            chunkFileNames: '[name].js',
            assetFileNames: '[name].[ext]'
          }
        }
      }
    });
  }

  console.log('Build complete!');
}

buildEntries().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
}); 