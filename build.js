import { build } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
}

// Merge feature CSS files into a single stylesheet
async function mergeFeatureStyles() {
  console.log('Merging feature styles into single stylesheet...');
  
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
    return;
  }
  
  let mergedCSS = '';
  
  // Process and merge each CSS file
  for (const file of cssFiles) {
    const fileName = path.basename(file);
    const relativePath = path.relative(srcDir, file);
    
    try {
      let cssContent = '';
      
      // Try to process with PostCSS first
      try {
        const { stdout, stderr } = await execAsync(`npx postcss "${file}" --to-stdout`);
        
        if (stderr) {
          console.warn(`PostCSS warning for ${fileName}:`, stderr);
        }
        
        cssContent = stdout;
        console.log(`Processed ${fileName} with PostCSS`);
      } catch (error) {
        // If PostCSS fails, fall back to reading raw file
        console.warn(`PostCSS failed for ${fileName}, falling back to raw CSS:`, error.message);
        cssContent = fs.readFileSync(file, 'utf8');
        console.log(`Read ${fileName} as raw CSS`);
      }
      
      // Add a comment header for each file
      mergedCSS += `\n/* === ${relativePath} === */\n`;
      mergedCSS += cssContent;
      mergedCSS += '\n';
      
    } catch (error) {
      console.error(`Failed to process ${fileName}:`, error);
    }
  }
  
  // Write the merged CSS to dist/styles/features.css
  const stylesDir = resolve(__dirname, 'dist/styles');
  if (!fs.existsSync(stylesDir)) {
    fs.mkdirSync(stylesDir, { recursive: true });
  }
  const outputPath = resolve(stylesDir, 'features.css');
  fs.writeFileSync(outputPath, mergedCSS, 'utf8');
  
  console.log(`Merged ${cssFiles.length} CSS files into features.css`);
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

  // Merge feature styles after all builds are complete
  await mergeFeatureStyles();

  console.log('Build complete!');
}

buildEntries().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
}); 