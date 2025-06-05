import { build } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  chrome: {
    outDir: 'dist',
    manifestModifications: {
      // Chrome uses service_worker
      background: {
        service_worker: 'background.js',
        type: 'module'
      }
    }
  },
  firefox: {
    outDir: 'dist-firefox',
    manifestModifications: {
      // Firefox uses scripts array and needs browser_specific_settings
      background: {
        scripts: ['browser-polyfill.js', 'background.js']
      },
      browser_specific_settings: {
        gecko: {
          id: "clutch-extension@lorem.sh",
          strict_min_version: "109.0"
        }
      },
      // Firefox doesn't support content script modules
      removeFromContentScripts: ['type']
    },
    needsPolyfill: true
  }
};

// Get target from command line args or default to chrome
const target = process.argv.includes('--firefox') ? 'firefox' : 'chrome';
const isWatch = process.argv.includes('--watch');
const targetConfig = config[target];

console.log(`🚀 Building for ${target.toUpperCase()}...`);

function copyThemeFiles(outDir) {
  console.log('📄 Copying theme CSS files...');
  
  const stylesDir = path.join(outDir, 'styles');
  if (!fs.existsSync(stylesDir)) {
    fs.mkdirSync(stylesDir, { recursive: true });
  }
  
  // Read all CSS files from src/themes directory
  const srcThemesDir = path.join(__dirname, 'src/themes');
  if (fs.existsSync(srcThemesDir)) {
    const themeFiles = fs.readdirSync(srcThemesDir)
      .filter(file => file.endsWith('.css'));
    
    // Copy each CSS file to dist/styles
    for (const file of themeFiles) {
      const srcPath = path.join(srcThemesDir, file);
      const destPath = path.join(stylesDir, file);
      fs.copyFileSync(srcPath, destPath);
      console.log(`  Copied ${file}`);
    }
    
    if (themeFiles.length === 0) {
      console.warn('  No CSS theme files found in', srcThemesDir);
    }
  } else {
    console.warn('  Themes directory not found at', srcThemesDir);
  }
}

function mergeFeatureStyles(outDir) {
  console.log('📦 Merging feature CSS files...');
  
  // Directories to ignore
  const ignoreDirs = ['popup', 'themes'];
  
  // Function to recursively find CSS files
  function findCSSFiles(dir) {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
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
  const srcDir = path.join(__dirname, 'src');
  const cssFiles = findCSSFiles(srcDir);
  
  if (cssFiles.length === 0) {
    console.warn('  No CSS files found in src directory');
    return;
  }
  
  console.log(`  Processing ${cssFiles.length} CSS files...`);
  
  // Process all CSS files
  let mergedCSS = '';
  for (const file of cssFiles) {
    const relativePath = path.relative(srcDir, file);
    const content = fs.readFileSync(file, 'utf8');
    
    mergedCSS += `\n/* === ${relativePath} === */\n`;
    mergedCSS += content;
    mergedCSS += '\n';
  }
  
  // Write the merged CSS to dist/styles/features.css
  const stylesDir = path.join(outDir, 'styles');
  if (!fs.existsSync(stylesDir)) {
    fs.mkdirSync(stylesDir, { recursive: true });
  }
  const outputPath = path.join(stylesDir, 'features.css');
  fs.writeFileSync(outputPath, mergedCSS, 'utf8');
  
  console.log(`  Merged ${cssFiles.length} CSS files into features.css`);
}

function createPopupHtml(outDir) {
  console.log('📄 Creating popup.html...');
  
  const popupHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="popup.css">
  </head>
  <body>
    <div id="popup"></div>
    <script src="popup.js"></script>
  </body>
</html>`;

  const popupPath = path.join(outDir, 'popup.html');
  fs.writeFileSync(popupPath, popupHtml);
}

async function createFirefoxPolyfill(outDir) {
  if (!targetConfig.needsPolyfill) return;
  
  console.log('📝 Creating Firefox browser polyfill...');
  
  const polyfillScript = `// Firefox/Chrome compatibility polyfill
if (typeof browser === 'undefined') {
  window.browser = {
    runtime: {
      sendMessage: chrome.runtime.sendMessage,
      onMessage: chrome.runtime.onMessage,
      getURL: chrome.runtime.getURL,
      id: chrome.runtime.id
    },
    storage: {
      local: {
        get: (items) => new Promise(resolve => chrome.storage.local.get(items, resolve)),
        set: (items) => new Promise(resolve => chrome.storage.local.set(items, resolve))
      }
    },
    tabs: {
      query: (options) => new Promise(resolve => chrome.tabs.query(options, resolve)),
      sendMessage: (tabId, message) => new Promise(resolve => chrome.tabs.sendMessage(tabId, message, resolve))
    }
  };
} else if (typeof chrome === 'undefined') {
  window.chrome = {
    runtime: {
      sendMessage: (message, callback) => {
        if (callback) {
          browser.runtime.sendMessage(message).then(callback, () => callback(null));
        } else {
          return browser.runtime.sendMessage(message);
        }
      },
      onMessage: browser.runtime.onMessage,
      getURL: browser.runtime.getURL,
      id: browser.runtime.id
    },
    storage: {
      local: {
        get: (items, callback) => browser.storage.local.get(items).then(callback),
        set: (items, callback) => browser.storage.local.set(items).then(() => callback && callback())
      }
    },
    tabs: {
      query: (options, callback) => browser.tabs.query(options).then(callback),
      sendMessage: (tabId, message, callback) => browser.tabs.sendMessage(tabId, message).then(callback)
    }
  };
}`;

  const polyfillPath = path.join(outDir, 'browser-polyfill.js');
  fs.writeFileSync(polyfillPath, polyfillScript);
}

function modifyManifest(outDir) {
  console.log(`🔧 Modifying manifest for ${target}...`);
  
  const manifestPath = path.join(outDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  // Apply target-specific modifications
  const modifications = targetConfig.manifestModifications;
  
  // Update background configuration
  if (modifications.background) {
    manifest.background = { ...manifest.background, ...modifications.background };
  }
  
  // Add browser_specific_settings for Firefox
  if (modifications.browser_specific_settings) {
    manifest.browser_specific_settings = modifications.browser_specific_settings;
  }
  
  // Firefox-specific content script modifications
  if (target === 'firefox' && manifest.content_scripts) {
    manifest.content_scripts.forEach(script => {
      // Add polyfill to content scripts
      if (script.js && !script.js.includes('browser-polyfill.js')) {
        script.js.unshift('browser-polyfill.js');
      }
      
      // Remove unsupported properties
      if (modifications.removeFromContentScripts) {
        modifications.removeFromContentScripts.forEach(prop => {
          delete script[prop];
        });
      }
    });
  }
  
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

async function runBuild() {
  const startTime = Date.now();
  
  try {
    // Clean output directory
    if (fs.existsSync(targetConfig.outDir)) {
      fs.rmSync(targetConfig.outDir, { recursive: true, force: true });
    }
    fs.mkdirSync(targetConfig.outDir, { recursive: true });
    
    // Copy public files first
    if (fs.existsSync('public')) {
      const publicFiles = fs.readdirSync('public');
      publicFiles.forEach(file => {
        const srcPath = path.join('public', file);
        const destPath = path.join(targetConfig.outDir, file);
        if (fs.statSync(srcPath).isFile()) {
          fs.copyFileSync(srcPath, destPath);
        }
      });
    }
    
    // Build each entry point separately to avoid ES modules
    const entryPoints = [
      { 
        name: 'background', 
        entry: 'src/core/background.ts',
        format: 'iife',
        fileName: 'background.js'
      },
      { 
        name: 'content', 
        entry: 'src/core/content.ts',
        format: 'iife',
        fileName: 'content.js'
      },
      { 
        name: 'popup', 
        entry: 'src/popup/popup.ts',
        format: 'iife',
        fileName: 'popup.js',
        cssFileName: 'popup.css'
      }
    ];

    for (const entryPoint of entryPoints) {
      console.log(`📦 Building ${entryPoint.name}...`);
      
      if (entryPoint.format === 'iife') {
        // For scripts, use lib mode to create IIFE bundles with no imports
        await build({
          configFile: false, // Don't use vite.config.ts
          mode: isWatch ? 'development' : 'production',
          plugins: [svelte()], // Add Svelte plugin for popup
          resolve: {
            alias: {
              '@': path.resolve(__dirname, 'src'),
              '$lib': path.resolve(__dirname, 'src/lib'),
              '$popup': path.resolve(__dirname, 'src/popup'),
              '$features': path.resolve(__dirname, 'src/features'),
              '$system': path.resolve(__dirname, 'src/system'),
              '$core': path.resolve(__dirname, 'src/core'),
              '$utils': path.resolve(__dirname, 'src/utils'),
              '$themes': path.resolve(__dirname, 'src/themes'),
            }
          },
          build: {
            outDir: targetConfig.outDir,
            emptyOutDir: false,
            minify: !isWatch,
            sourcemap: isWatch,
            watch: isWatch ? {} : null,
            lib: {
              entry: entryPoint.entry,
              formats: ['iife'],
              name: `${entryPoint.name}Bundle`,
              fileName: () => entryPoint.fileName
            },
            rollupOptions: {
              output: {
                extend: true, // Don't override global variables
                format: 'iife',
                assetFileNames: (assetInfo) => {
                  if (assetInfo.name?.endsWith('.css')) {
                    return entryPoint.cssFileName || 'clutch-ext.css';
                  }
                  return '[name].[ext]';
                }
              }
            }
          }
        });
      } else {
        // For HTML files, use regular build
        await build({
          configFile: 'vite.config.ts',
          mode: isWatch ? 'development' : 'production',
          build: {
            outDir: targetConfig.outDir,
            emptyOutDir: false,
            minify: !isWatch,
            sourcemap: isWatch,
            watch: isWatch ? {} : null,
            rollupOptions: {
              input: {
                [entryPoint.name]: entryPoint.entry
              },
              output: {
                entryFileNames: '[name].html',
                chunkFileNames: '[name].js',
                assetFileNames: '[name].[ext]'
              }
            }
          }
        });
      }
    }
    
    // Copy theme CSS files and merge feature styles
    copyThemeFiles(targetConfig.outDir);
    mergeFeatureStyles(targetConfig.outDir);
    
    // Create popup.html file
    createPopupHtml(targetConfig.outDir);
    
    // Create Firefox polyfill if needed
    await createFirefoxPolyfill(targetConfig.outDir);
    
    // Modify manifest for target browser
    modifyManifest(targetConfig.outDir);
    
    const duration = Date.now() - startTime;
    console.log(`✅ ${target.toUpperCase()} build completed in ${duration}ms`);
    
    if (isWatch) {
      console.log('👀 Watching for changes...');
    }
    
  } catch (error) {
    console.error(`❌ Build failed:`, error);
    process.exit(1);
  }
}

runBuild(); 