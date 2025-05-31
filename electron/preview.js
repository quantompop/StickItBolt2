import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Get __dirname equivalent in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Make sure the dist-electron directory exists
const distElectronDir = join(__dirname, '..', 'dist-electron');
if (!fs.existsSync(distElectronDir)) {
  fs.mkdirSync(distElectronDir, { recursive: true });
}

console.log('🚀 Starting Electron preview...');
console.log('📂 Current directory:', process.cwd());
console.log('📂 __dirname:', __dirname);

// Copy the main and preload scripts to dist-electron
const mainPath = join(__dirname, 'main.js');
const preloadPath = join(__dirname, 'preload.js');
const mainDestPath = join(distElectronDir, 'main.js');
const preloadDestPath = join(distElectronDir, 'preload.js');

try {
  // Read the main script
  let mainContent = fs.readFileSync(mainPath, 'utf8');
  
  // Fix paths in the main script
  mainContent = mainContent
    .replace(
      'join(__dirname, \'../dist/index.html\')', 
      'join(__dirname, \'../dist/index.html\')'
    )
    .replace(
      'join(__dirname, \'../public/icons/icon.png\')', 
      'join(__dirname, \'../public/icons/icon.png\')'
    );
  
  // Write the modified main script
  fs.writeFileSync(mainDestPath, mainContent, 'utf8');
  console.log('✅ Main script copied to:', mainDestPath);
  
  // Copy the preload script
  fs.copyFileSync(preloadPath, preloadDestPath);
  console.log('✅ Preload script copied to:', preloadDestPath);
} catch (error) {
  console.error('❌ Error copying scripts:', error);
  process.exit(1);
}

// Start Electron
console.log('🔄 Launching Electron...');
const electron = spawn('electron', ['.'], { 
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, ELECTRON_ENABLE_LOGGING: 1 }
});

electron.on('error', (error) => {
  console.error('❌ Failed to start Electron:', error);
  process.exit(1);
});

electron.on('close', (code) => {
  console.log(`🛑 Electron exited with code ${code}`);
  process.exit(code || 0);
});

// Handle process termination
process.on('SIGINT', () => {
  electron.kill();
  process.exit(0);
});