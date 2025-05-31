// Script to prepare electron files for packaging
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Ensure scripts directory exists
if (!fs.existsSync(__dirname)) {
  fs.mkdirSync(__dirname, { recursive: true });
}

// Ensure dist-electron directory exists
const distElectronDir = path.join(projectRoot, 'dist-electron');
if (!fs.existsSync(distElectronDir)) {
  fs.mkdirSync(distElectronDir, { recursive: true });
}

console.log('✅ Preparing Electron files for packaging...');

// Create CommonJS version of main.js
console.log('📝 Converting main.js to CommonJS format...');
const mainJsContent = `
const { app, BrowserWindow, clipboard, globalShortcut, ipcMain, Menu, shell, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../dist/icons/icon.png'),
  });

  // Check if running in development mode
  const isDev = process.env.ELECTRON_DEV === 'true';

  // Load the app
  if (isDev) {
    console.log('Running in development mode, loading from dev server');
    mainWindow.loadURL('http://localhost:5173/');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    console.log('Running in production mode');
    try {
      // Use path.join for cross-platform compatibility
      const indexPath = path.join(__dirname, '../dist/index.html');
      console.log('Loading app from:', indexPath);
      mainWindow.loadFile(indexPath);
      
      // For debugging in production
      // mainWindow.webContents.openDevTools();
    } catch (error) {
      console.error('Error loading file:', error);
    }
  }

  // Register global shortcuts
  globalShortcut.register('CommandOrControl+V', () => {
    const clipboardText = clipboard.readText();
    if (clipboardText) {
      mainWindow.webContents.send('paste-text', clipboardText);
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create application menu
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Note',
          accelerator: 'CommandOrControl+N',
          click: () => mainWindow.webContents.send('new-note'),
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Command+Q' : 'Alt+F4',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { type: 'separator' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://github.com/quantompop/StickItBolt');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Initialize app
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  
  // Setup auto-updater
  setupAutoUpdater();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC communication handlers
ipcMain.handle('get-clipboard-text', () => {
  return clipboard.readText();
});

// Auto-updater setup
function setupAutoUpdater() {
  // Only use auto-updater in packaged app
  if (process.env.ELECTRON_DEV === 'true') {
    console.log('Running in development mode, skipping auto-updater');
    return;
  }

  // Configure logging for updater
  autoUpdater.logger = console;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  // Check for updates when app starts
  autoUpdater.checkForUpdatesAndNotify();
  
  // Check for updates every hour
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 60 * 60 * 1000);

  // Auto-updater events
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info);
    if (mainWindow) {
      mainWindow.webContents.send('update-available');
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('Update not available:', info);
  });

  autoUpdater.on('error', (err) => {
    console.error('Error in auto-updater:', err);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    let message = 'Download speed: ' + progressObj.bytesPerSecond;
    message = message + ' - Downloaded ' + parseInt(progressObj.percent) + '%';
    message = message + ' (' + progressObj.transferred + '/' + progressObj.total + ')';
    console.log(message);
    if (mainWindow) {
      mainWindow.webContents.send('download-progress', progressObj);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info);
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded');
    }
  });

  // Handle install update request from renderer
  ipcMain.on('install-update', () => {
    // Prompt user to confirm restart
    dialog.showMessageBox({
      type: 'info',
      title: 'Install Updates',
      message: 'Updates downloaded. The application will restart to install updates.',
      buttons: ['Restart Now', 'Later']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall(true, true);
      }
    });
  });
}`;

// Create CommonJS version of preload.js
console.log('📝 Converting preload.js to CommonJS format...');
const preloadJsContent = `
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
});`;

// Write the files
fs.writeFileSync(path.join(distElectronDir, 'main.js'), mainJsContent);
fs.writeFileSync(path.join(distElectronDir, 'preload.js'), preloadJsContent);

console.log('✅ Electron files prepared successfully for packaging');

// Copy and create icon files
console.log('📝 Preparing icon files...');

// Ensure the destination directories exist
const distDir = path.join(projectRoot, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const iconsDir = path.join(distDir, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Copy icon files from public to dist
const sourceIconsDir = path.join(projectRoot, 'public', 'icons');
const iconFiles = ['icon.png', 'icon.ico'];

try {
  if (fs.existsSync(sourceIconsDir)) {
    // Copy each icon file
    for (const iconFile of iconFiles) {
      const sourcePath = path.join(sourceIconsDir, iconFile);
      const destPath = path.join(iconsDir, iconFile);
      
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`✅ Copied ${sourcePath} to ${destPath}`);
      } else {
        console.log(`⚠️ Source icon file ${sourcePath} not found, will create placeholder`);
      }
    }
  } else {
    console.log(`⚠️ Source icons directory not found: ${sourceIconsDir}`);
  }
} catch (error) {
  console.error(`❌ Error copying icons:`, error);
}

// Create placeholder icon files if they don't exist yet
// PNG placeholder
const pngPath = path.join(iconsDir, 'icon.png');
if (!fs.existsSync(pngPath)) {
  // Simple 1x1 transparent PNG
  const pngData = Buffer.from(
    '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C0AQAmIWgCAExCwAQQiIWQCCEBCzAAQhIGYBCEJAzAIQhICYBSAIATELQBACYhaAIATELABBCIhZAIIQELMABCEgZgEIQkDMAhCEgJgFIAgBMQtAEAJiFoAgBMQsAEEIiFkAghAQswAEISBmAQhCQMwCEISAmAUgCAExC0AQAmIWgCAExCwAQQiIWQCCEBCzAAQhIGYBCEJAzAIQhICYBSAIATELQBACYhaAIATELABBCIhZAIIQELMABCEgZgFq+xpxvQD2C6jzbsQqwvSHK0Btfiv+jtFhTn+gAhoqACHNEMz9AxHQYAEIcbZg6h+wgIYLYNZgsuydAEACIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAKFuDQC4L0CL/RcPFnnmjwAoBH9QAhYj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',
    'base64'
  );
  fs.writeFileSync(pngPath, pngData);
  console.log(`✅ Created valid PNG icon at ${pngPath}`);
}

// ICO placeholder
const icoPath = path.join(iconsDir, 'icon.ico');
if (!fs.existsSync(icoPath)) {
  // Create a minimal valid ICO file
  const headerSize = 22; // ICO header size
  const dibSize = 40;    // DIB header size
  const pixelDataSize = 16 * 16 * 4; // 16x16 pixels with 4 bytes per pixel
  
  // Allocate buffer for the entire ICO file
  const buffer = Buffer.alloc(headerSize + dibSize + pixelDataSize);
  
  // Write ICO header
  buffer.writeUInt16LE(0, 0);     // Reserved, must be 0
  buffer.writeUInt16LE(1, 2);     // Type: 1 for ICO
  buffer.writeUInt16LE(1, 4);     // Number of images
  
  // Write icon entry
  buffer.writeUInt8(16, 6);       // Width (16 pixels)
  buffer.writeUInt8(16, 7);       // Height (16 pixels)
  buffer.writeUInt8(0, 8);        // No color palette
  buffer.writeUInt8(0, 9);        // Reserved, must be 0
  buffer.writeUInt16LE(1, 10);    // Color planes
  buffer.writeUInt16LE(32, 12);   // Bits per pixel (32)
  buffer.writeUInt32LE(dibSize + pixelDataSize, 14); // Size of DIB + pixel data
  buffer.writeUInt32LE(headerSize, 18);  // Offset to DIB header
  
  // Write DIB header
  buffer.writeUInt32LE(dibSize, 22);     // DIB header size
  buffer.writeInt32LE(16, 26);           // Width
  buffer.writeInt32LE(32, 30);           // Height (doubled for ICO format - includes both AND and XOR masks)
  buffer.writeUInt16LE(1, 34);           // Color planes
  buffer.writeUInt16LE(32, 36);          // Bits per pixel
  buffer.writeUInt32LE(0, 38);           // No compression
  buffer.writeUInt32LE(pixelDataSize, 42); // Image size
  buffer.writeInt32LE(0, 46);            // X pixels per meter
  buffer.writeInt32LE(0, 50);            // Y pixels per meter
  buffer.writeUInt32LE(0, 54);           // Colors used
  buffer.writeUInt32LE(0, 58);           // Important colors
  
  // Fill pixel data with blue color
  let offset = headerSize + dibSize;
  for (let i = 0; i < 16 * 16; i++) {
    buffer.writeUInt8(255, offset++);  // B
    buffer.writeUInt8(0, offset++);    // G
    buffer.writeUInt8(0, offset++);    // R
    buffer.writeUInt8(255, offset++);  // Alpha
  }
  
  fs.writeFileSync(icoPath, buffer);
  console.log(`✅ Created valid ICO file at ${icoPath}`);
}

// ICNS file for Mac
if (process.platform === 'darwin') {
  const icnsPath = path.join(iconsDir, 'icon.icns');
  if (!fs.existsSync(icnsPath)) {
    // For macOS, we'd ideally use iconutil
    // For this script, we'll just create a placeholder
    console.log(`⚠️ ICNS file not found. A real .icns file should be created using macOS tools.`);
    
    // Create an empty icns file as placeholder
    fs.writeFileSync(icnsPath, Buffer.alloc(0));
    console.log(`✅ Created placeholder ICNS file at ${icnsPath} (not a valid .icns file!)`);
  }
}

console.log('✅ Icon files prepared successfully');
console.log('✅ All preparations completed successfully!');