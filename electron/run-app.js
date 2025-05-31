import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Define __dirname equivalent for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Check if node_modules/electron exists
const electronPath = path.join(__dirname, '..', 'node_modules', 'electron');
if (!fs.existsSync(electronPath)) {
  console.error('Electron module not found. Reinstalling...');
  
  // Run npm install electron --force
  const install = spawn('npm', ['install', 'electron@30.0.3', '--save-dev', '--force'], {
    stdio: 'inherit',
    shell: true
  });
  
  install.on('close', (code) => {
    if (code !== 0) {
      console.error('Failed to reinstall Electron');
      process.exit(1);
    }
    
    console.log('Electron reinstalled successfully');
    startElectron();
  });
} else {
  startElectron();
}

function startElectron() {
  // Check if we have the proper directories
  const distElectronDir = path.join(__dirname, '..', 'dist-electron');
  if (!fs.existsSync(distElectronDir)) {
    fs.mkdirSync(distElectronDir, { recursive: true });
  }
  
  // Copy main.js and preload.js to dist-electron
  const mainJsPath = path.join(distElectronDir, 'main.js');
  const preloadJsPath = path.join(distElectronDir, 'preload.js');
  
  fs.copyFileSync(path.join(__dirname, 'main.js'), mainJsPath);
  fs.copyFileSync(path.join(__dirname, 'preload.js'), preloadJsPath);
  
  console.log('Starting Vite dev server...');
  const vite = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true
  });
  
  // Give vite some time to start
  setTimeout(() => {
    console.log('Starting Electron...');
    const electron = spawn('npx', ['electron', '.'], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, ELECTRON_DEV: 'true', ELECTRON_ENABLE_LOGGING: '1' }
    });
    
    electron.on('close', (code) => {
      vite.kill();
      process.exit(code || 0);
    });
    
    vite.on('close', (code) => {
      electron.kill();
      process.exit(code || 0);
    });
  }, 3000);
}