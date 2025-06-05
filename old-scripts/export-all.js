import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Get version from command line arguments
const version = process.argv[2];

if (!version) {
  console.error('Please provide a version number: npm run export:all <version>');
  process.exit(1);
}

async function exportBoth() {
  try {
    // Export Chrome version
    console.log(`🚀 Exporting Chrome version ${version}...`);
    await execAsync(`node export.js ${version}`, { stdio: 'inherit' });
    
    // Export Firefox version
    console.log(`\n🦊 Exporting Firefox version ${version}...`);
    await execAsync(`node export-firefox.js ${version}`, { stdio: 'inherit' });
    
    console.log('\n✅ Both extensions exported successfully! 🎉');
  } catch (error) {
    console.error('Error during export process:', error);
    process.exit(1);
  }
}

exportBoth(); 