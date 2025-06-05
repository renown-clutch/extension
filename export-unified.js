import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration for different targets
const config = {
  chrome: {
    buildCommand: 'node build-unified.js',
    distDir: 'dist',
    zipPrefix: 'clutch_extension_chrome_',
    manifestPath: 'public/manifest.json'
  },
  firefox: {
    buildCommand: 'node build-unified.js --firefox',
    distDir: 'dist-firefox',
    zipPrefix: 'clutch_extension_firefox_',
    manifestPath: 'public/manifest.json'
  }
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  
  // Check for target flags
  const isFirefox = args.includes('--firefox');
  const isAll = args.includes('--all');
  const version = args.find(arg => !arg.startsWith('--'));
  
  if (!version) {
    console.error('❌ Please provide a version number: npm run export <version> [--firefox|--all]');
    console.error('   Examples:');
    console.error('     npm run export 1.2.3          # Chrome only');
    console.error('     npm run export 1.2.3 --firefox # Firefox only');
    console.error('     npm run export 1.2.3 --all     # Both browsers');
    process.exit(1);
  }
  
  return {
    version,
    targets: isAll ? ['chrome', 'firefox'] : [isFirefox ? 'firefox' : 'chrome']
  };
}

// Update version in files
async function updateVersions(version) {
  console.log(`📝 Updating version to ${version}...`);
  
  try {
    // Update package.json
    const packagePath = path.join(__dirname, 'package.json');
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    packageData.version = version;
    fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2));
    console.log('  ✅ Updated package.json');

    // Update manifest.json
    const manifestPath = path.join(__dirname, 'public/manifest.json');
    const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifestData.version = version;
    
    // Clean up content_scripts matches (remove file://*/*)
    if (manifestData.content_scripts && manifestData.content_scripts[0]) {
      manifestData.content_scripts[0].matches = manifestData.content_scripts[0].matches.filter(
        match => match !== 'file://*/*'
      );
    }
    
    // Clean up web_accessible_resources matches
    if (manifestData.web_accessible_resources && manifestData.web_accessible_resources[0]) {
      manifestData.web_accessible_resources[0].matches = manifestData.web_accessible_resources[0].matches.filter(
        match => match !== 'file://*/*'
      );
    }
    
    fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2));
    console.log('  ✅ Updated manifest.json');

    // Update Settings.svelte
    const settingsPath = path.join(__dirname, 'src/popup/tabs/Settings.svelte');
    if (fs.existsSync(settingsPath)) {
      let settingsContent = fs.readFileSync(settingsPath, 'utf8');
      settingsContent = settingsContent.replace(
        /<p class="capitalize text-slate-200 text-xs">Version .+?<\/p>/,
        `<p class="capitalize text-slate-200 text-xs">Version ${version}</p>`
      );
      fs.writeFileSync(settingsPath, settingsContent);
      console.log('  ✅ Updated Settings.svelte');
    }

    // Update README.md
    const readmePath = path.join(__dirname, 'README.md');
    if (fs.existsSync(readmePath)) {
      let readmeContent = fs.readFileSync(readmePath, 'utf8');
      readmeContent = readmeContent.replace(
        /\*\*Version:\*\* .+/,
        `**Version:** ${version}`
      );
      fs.writeFileSync(readmePath, readmeContent);
      console.log('  ✅ Updated README.md');
    }

  } catch (error) {
    console.error('❌ Error updating versions:', error);
    throw error;
  }
}

// Clean manifest for Chrome compatibility
function cleanChromeManifest(distDir) {
  const manifestPath = path.join(distDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  // Remove type: module from background for Chrome compatibility
  if (manifest.background && manifest.background.type === 'module') {
    delete manifest.background.type;
  }
  
  // Remove type: module from content_scripts
  if (manifest.content_scripts) {
    manifest.content_scripts.forEach(script => {
      if (script.type === 'module') {
        delete script.type;
      }
    });
  }
  
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

// Create zip archive
async function createZip(distDir, zipFilename) {
  return new Promise((resolve, reject) => {
    const exportDir = path.join(__dirname, 'export');
    
    // Ensure export directory exists
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    
    const output = fs.createWriteStream(path.join(exportDir, zipFilename));
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => {
      console.log(`  ✅ Created ${zipFilename} (${archive.pointer()} bytes)`);
      resolve();
    });
    
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(distDir, false);
    archive.finalize();
  });
}

// Export for a specific target
async function exportTarget(target, version) {
  const targetConfig = config[target];
  const versionForFilename = version.replace(/\./g, '');
  const zipFilename = `${targetConfig.zipPrefix}${versionForFilename}.zip`;
  
  console.log(`\n📦 Building ${target.toUpperCase()} extension...`);
  
  try {
    // Run the build
    await execAsync(targetConfig.buildCommand);
    console.log(`  ✅ ${target.toUpperCase()} build completed`);
    
    // Chrome-specific manifest cleaning
    if (target === 'chrome') {
      cleanChromeManifest(targetConfig.distDir);
      console.log('  ✅ Cleaned manifest for Chrome compatibility');
    }
    
    // Create zip
    await createZip(targetConfig.distDir, zipFilename);
    
    console.log(`🎉 ${target.toUpperCase()} export completed successfully!`);
    
  } catch (error) {
    console.error(`❌ Error during ${target} export:`, error);
    throw error;
  }
}

// Main export function
async function exportExtension() {
  const { version, targets } = parseArgs();
  
  console.log(`🚀 Starting export process for version ${version}`);
  console.log(`📋 Targets: ${targets.join(', ')}`);
  
  try {
    // Update versions in all files
    await updateVersions(version);
    
    // Export for each target
    for (const target of targets) {
      await exportTarget(target, version);
    }
    
    console.log('\n🎉 All exports completed successfully!');
    console.log(`📁 Check the export/ directory for your zip files.`);
    
  } catch (error) {
    console.error('\n❌ Export process failed:', error);
    process.exit(1);
  }
}

exportExtension(); 