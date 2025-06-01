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
  
  // Create CommonJS version of preload.js
  const preloadContent = `
// Preload script uses CommonJS format for Electron
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Clipboard operations
  getClipboardText: () => ipcRenderer.invoke('get-clipboard-text'),
  
  // Event listeners
  onPasteText: (callback) => {
    const subscription = (_event, text) => callback(text);
    ipcRenderer.on('paste-text', subscription);
    return () => ipcRenderer.removeListener('paste-text', subscription);
  },
  
  onNewNote: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('new-note', subscription);
    return () => ipcRenderer.removeListener('new-note', subscription);
  },
  
  // Updates
  onUpdateAvailable: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('update-available', subscription);
    return () => ipcRenderer.removeListener('update-available', subscription);
  },
  
  onUpdateDownloaded: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('update-downloaded', subscription);
    return () => ipcRenderer.removeListener('update-downloaded', subscription);
  },
  
  onDownloadProgress: (callback) => {
    const subscription = (_event, progressObj) => callback(progressObj);
    ipcRenderer.on('download-progress', subscription);
    return () => ipcRenderer.removeListener('download-progress', subscription);
  },
  
  installUpdate: () => ipcRenderer.send('install-update'),
  
  // New functions for managing update repository
  setUpdateRepository: (repoUrl) => ipcRenderer.invoke('set-update-repository', repoUrl),
  getUpdateRepository: () => ipcRenderer.invoke('get-update-repository'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates')
});`;

  // Write the CommonJS version of preload.js
  fs.writeFileSync(preloadDestPath, preloadContent, 'utf8');
  console.log('✅ CommonJS preload.js created at:', preloadDestPath);
  
} catch (error) {
  console.error('❌ Error creating Electron files:', error);
  process.exit(1);
}

// Start the preview server
console.log('🔄 Starting preview server...');
const vite = spawn('npx', ['vite', 'preview', '--port', '4173', '--host'], {
  stdio: 'inherit',
  shell: true
});

vite.on('error', (error) => {
  console.error('❌ Failed to start preview server:', error);
  process.exit(1);
});

// Open the browser with the wrapper page
setTimeout(() => {
  const openUrl = 'http://localhost:4173/electron-preview.html';
  console.log(`🌐 Opening browser at: ${openUrl}`);
  
  // Use appropriate command based on platform
  let command, args;
  switch (process.platform) {
    case 'win32':
      command = 'start';
      args = ['""', openUrl];
      break;
    case 'darwin':
      command = 'open';
      args = [openUrl];
      break;
    default:
      command = 'xdg-open';
      args = [openUrl];
      break;
  }
  
  const browser = spawn(command, args, { 
    stdio: 'inherit',
    shell: true
  });
  
  browser.on('error', (error) => {
    console.error('❌ Failed to open browser:', error);
    console.log(`📝 Please open manually: ${openUrl}`);
  });
}, 3000);

// Handle process termination
process.on('SIGINT', () => {
  vite.kill();
  process.exit(0);
});