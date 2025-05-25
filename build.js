import { build } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if we're in watch mode
const isWatch = process.argv.includes('--watch');

// Timing utilities
const timers = {};
function startTimer(name) {
  timers[name] = Date.now();
  console.log(`⏱️  Starting ${name}...`);
}

function endTimer(name) {
  if (timers[name]) {
    const duration = Date.now() - timers[name];
    console.log(`✅ ${name} completed in ${duration}ms`);
    delete timers[name];
    return duration;
  }
}

// CSS processing cache
const cssCache = new Map();
const CACHE_FILE = resolve(__dirname, '.css-cache.json');

// Load cache from disk
function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      for (const [key, value] of Object.entries(cacheData)) {
        cssCache.set(key, value);
      }
    }
  } catch (error) {
    console.warn('Failed to load CSS cache:', error.message);
  }
}

// Save cache to disk
function saveCache() {
  try {
    const cacheData = Object.fromEntries(cssCache);
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2));
  } catch (error) {
    console.warn('Failed to save CSS cache:', error.message);
  }
}

// Check if file needs PostCSS processing
function needsPostCSS(filePath, content) {
  // Skip PostCSS for files that don't use Tailwind classes or @apply directives
  const hasPostCSSFeatures = content.includes('@apply') || 
                             content.includes('@tailwind') ||
                             content.includes('@layer') ||
                             /\b(bg-|text-|p-|m-|w-|h-|flex|grid|border-|rounded-|shadow-|hover:|focus:)/g.test(content);
  
  return hasPostCSSFeatures;
}

// Initialize PostCSS processor
const postcssProcessor = postcss([
  tailwindcss(),
  autoprefixer()
]);

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
  startTimer('Copy theme files');
  
  const stylesDir = resolve(__dirname, 'dist/styles');
  if (!fs.existsSync(stylesDir)) {
    fs.mkdirSync(stylesDir, { recursive: true });
  }
  
  // Read all CSS files from src/themes directory
  const srcThemesDir = resolve(__dirname, 'src/themes');
  if (fs.existsSync(srcThemesDir)) {
    const themeFiles = fs.readdirSync(srcThemesDir)
      .filter(file => file.endsWith('.css'));
    
    // Copy each CSS file to dist/styles
    for (const file of themeFiles) {
      const srcPath = resolve(srcThemesDir, file);
      const destPath = resolve(stylesDir, file);
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied ${file}`);
    }
    
    if (themeFiles.length === 0) {
      console.warn('No CSS theme files found in', srcThemesDir);
    }
  } else {
    console.warn('Themes directory not found at', srcThemesDir);
  }
  
  endTimer('Copy theme files');
}

// Merge feature CSS files into a single stylesheet (super optimized)
async function mergeFeatureStyles() {
  startTimer('Merge feature styles');
  
  // Load cache
  loadCache();
  
  // Directories to ignore
  const ignoreDirs = ['popup', 'themes'];
  
  // Function to recursively find CSS files
  function findCSSFiles(dir) {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip ignored directories
        if (!ignoreDirs.includes(entry.name)) {
          files.push(...findCSSFiles(fullPath));
        }
      } else if (entry.isFile() && entry.name.endsWith('.css')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }
  
  // Find all CSS files in src directory
  const srcDir = resolve(__dirname, 'src');
  const cssFiles = findCSSFiles(srcDir);
  
  if (cssFiles.length === 0) {
    console.warn('No CSS files found in src directory');
    endTimer('Merge feature styles');
    return;
  }
  
  console.log(`📦 Processing ${cssFiles.length} CSS files in parallel...`);
  
  // Process all CSS files in parallel with smart caching
  const processFile = async (file) => {
    const fileName = path.basename(file);
    const relativePath = path.relative(srcDir, file);
    const fileStartTime = Date.now();
    
    try {
      // Get file stats for cache key
      const stats = fs.statSync(file);
      const cacheKey = `${file}:${stats.mtime.getTime()}:${stats.size}`;
      
      // Check cache first
      if (cssCache.has(cacheKey)) {
        const duration = Date.now() - fileStartTime;
        console.log(`⚡ Used cached ${fileName} (${duration}ms)`);
        return {
          relativePath,
          content: cssCache.get(cacheKey),
          order: cssFiles.indexOf(file)
        };
      }
      
      // Read file content
      const rawContent = fs.readFileSync(file, 'utf8');
      let cssContent = rawContent;
      
      // Check if file needs PostCSS processing
      if (needsPostCSS(file, rawContent)) {
        try {
          // Use native PostCSS API instead of CLI
          const result = await postcssProcessor.process(rawContent, { 
            from: file,
            to: undefined 
          });
          cssContent = result.css;
          
          const duration = Date.now() - fileStartTime;
          console.log(`✅ Processed ${fileName} with PostCSS (${duration}ms)`);
        } catch (error) {
          console.warn(`PostCSS failed for ${fileName}, using raw CSS:`, error.message);
          cssContent = rawContent;
          const duration = Date.now() - fileStartTime;
          console.log(`✅ Used raw ${fileName} (${duration}ms)`);
        }
      } else {
        const duration = Date.now() - fileStartTime;
        console.log(`⚡ Skipped PostCSS for ${fileName} (${duration}ms)`);
      }
      
      // Cache the result
      cssCache.set(cacheKey, cssContent);
      
      return {
        relativePath,
        content: cssContent,
        order: cssFiles.indexOf(file)
      };
      
    } catch (error) {
      console.error(`❌ Failed to process ${fileName}:`, error);
      return null;
    }
  };
  
  // Process all files in parallel
  const results = await Promise.all(cssFiles.map(processFile));
  
  // Filter out failed results and sort by original order
  const validResults = results
    .filter(result => result !== null)
    .sort((a, b) => a.order - b.order);
  
  // Merge all CSS content
  let mergedCSS = '';
  for (const result of validResults) {
    mergedCSS += `\n/* === ${result.relativePath} === */\n`;
    mergedCSS += result.content;
    mergedCSS += '\n';
  }
  
  // Write the merged CSS to dist/styles/features.css
  const stylesDir = resolve(__dirname, 'dist/styles');
  if (!fs.existsSync(stylesDir)) {
    fs.mkdirSync(stylesDir, { recursive: true });
  }
  const outputPath = resolve(stylesDir, 'features.css');
  fs.writeFileSync(outputPath, mergedCSS, 'utf8');
  
  // Save cache
  saveCache();
  
  console.log(`📦 Merged ${validResults.length} CSS files into features.css`);
  endTimer('Merge feature styles');
}

// Build each entry point
async function buildEntries() {
  startTimer('Total build time');
  
  // Copy public files first
  startTimer('Copy public files');
  if (fs.existsSync('public')) {
    fs.cpSync('public', 'dist', { recursive: true });
  }
  endTimer('Copy public files');
  
  // Copy theme files
  copyThemeFiles();

  // Start CSS merging in parallel with builds
  const cssPromise = mergeFeatureStyles();

  // Build all entry points in parallel
  const buildPromises = entryPoints.map(async (entry) => {
    startTimer(`Build ${entry.name}`);
    
    await build({
      configFile: false,
      root: '.',
      plugins: [
        svelte({
          compilerOptions: {
            dev: false
          }
        }),
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
      esbuild: {
        target: 'esnext',
        minify: true,
        treeShaking: true
      },
      build: {
        watch: isWatch ? {} : null,
        target: 'esnext',
        minify: 'esbuild',
        emptyOutDir: false,
        copyPublicDir: false,
        reportCompressedSize: false, // Skip gzip size calculation for speed
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
          input: entry.input,
          output: {
            inlineDynamicImports: true,
            dir: entry.outputPath,
            entryFileNames: entry.name === 'content' ? 'content.js' : '[name].js',
            chunkFileNames: '[name].js',
            assetFileNames: '[name].[ext]'
          },
          treeshake: {
            moduleSideEffects: false,
            propertyReadSideEffects: false,
            unknownGlobalSideEffects: false
          }
        }
      }
    });
    
    endTimer(`Build ${entry.name}`);
  });

  // Wait for both builds and CSS processing to complete
  await Promise.all([...buildPromises, cssPromise]);

  endTimer('Total build time');
  console.log('🎉 Build complete!');
}

buildEntries().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
}); 