import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get version from command line arguments
const version = process.argv[2];

if (!version) {
  console.error('Please provide a version number: npm run export <version>');
  process.exit(1);
}

// Remove dots to create filename
const versionForFilename = version.replace(/\./g, '');

async function updateVersions() {
  try {
    // Update package.json
    const packagePath = path.join(__dirname, 'package.json');
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    packageData.version = version;
    fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2));
    console.log(`✅ Updated version in package.json to ${version}`);

    // Update manifest.json
    const manifestPath = path.join(__dirname, 'public/manifest.json');
    const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifestData.version = version;
    fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2));
    console.log(`✅ Updated version in manifest.json to ${version}`);

    // Update Settings.svelte
    const settingsPath = path.join(__dirname, 'src/popup/tabs/Settings.svelte');
    let settingsContent = fs.readFileSync(settingsPath, 'utf8');
    settingsContent = settingsContent.replace(
      /<p class="capitalize text-slate-400 text-xs">Version .+?<\/p>/,
      `<p class="capitalize text-slate-400 text-xs">Version ${version}</p>`
    );
    fs.writeFileSync(settingsPath, settingsContent);
    console.log(`✅ Updated version in Settings.svelte to ${version}`);

    // Run the build
    console.log('📦 Building extension...');
    await execAsync('npm run build');
    console.log('✅ Build completed');

    // Create zip file
    const zipFilename = `clutch_extension_${versionForFilename}.zip`;
    const output = fs.createWriteStream(path.join(__dirname, zipFilename));
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);
    archive.directory(path.join(__dirname, 'dist/'), false);
    
    await archive.finalize();
    
    console.log(`✅ Created ${zipFilename}`);
    console.log('Export completed successfully! 🎉');
  } catch (error) {
    console.error('Error during export process:', error);
    process.exit(1);
  }
}

updateVersions(); 