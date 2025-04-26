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
  console.error('Please provide a version number: npm run export:firefox <version>');
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

    // Ensure export directory exists
    const exportDir = path.join(__dirname, 'export');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir);
      console.log('📁 Created export directory');
    }

    // Run the Firefox build
    console.log('📦 Building Firefox extension...');
    await execAsync('npm run build:firefox');
    console.log('✅ Firefox build completed');

    // Create zip file
    const zipFilename = `clutch_extension_firefox_${versionForFilename}.zip`;
    const output = fs.createWriteStream(path.join(exportDir, zipFilename));
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);
    archive.directory(path.join(__dirname, 'dist-firefox/'), false);
    
    await archive.finalize();
    
    console.log(`✅ Created ${zipFilename} in export/ directory`);
    console.log('Firefox export completed successfully! 🎉');
  } catch (error) {
    console.error('Error during Firefox export process:', error);
    process.exit(1);
  }
}

updateVersions(); 