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
    icon: path.join(__dirname, '../dist/icons/icon.ico'),
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

// Create minimal valid icon files
const createIcoFile = () => {
  // This is a minimal valid .ico file (1x1 px)
  const icoHeader = Buffer.from([
    0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x10, 0x10, 
    0x00, 0x00, 0x01, 0x00, 0x20, 0x00, 0x68, 0x04, 
    0x00, 0x00, 0x16, 0x00, 0x00, 0x00
  ]);
  
  // Simple 16x16 bitmap data
  const bmpData = Buffer.alloc(16*16*4);
  
  // Fill with a blue color
  for (let i = 0; i < bmpData.length; i += 4) {
    bmpData[i] = 0; // B
    bmpData[i + 1] = 0; // G
    bmpData[i + 2] = 255; // R
    bmpData[i + 3] = i < bmpData.length/2 ? 255 : 0; // Alpha
  }
  
  return Buffer.concat([icoHeader, bmpData]);
};

const createPngFile = () => {
  // This is a minimal valid PNG file (1x1 transparent pixel)
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAEtAI0Ke7kaAAAAABJRU5ErkJggg==',
    'base64'
  );
};

// Define icon files to create
const iconFiles = [
  { path: path.join(iconsDir, 'icon.ico'), create: createIcoFile },
  { path: path.join(iconsDir, 'icon.png'), create: createPngFile }
];

// Create each icon file
for (const icon of iconFiles) {
  try {
    // First try to copy from public directory if it exists
    const srcPath = path.join(projectRoot, 'public', 'icons', path.basename(icon.path));
    
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, icon.path);
      console.log(`✅ Copied ${srcPath} to ${icon.path}`);
    } else {
      // If source doesn't exist, create a placeholder
      const iconBuffer = icon.create();
      fs.writeFileSync(icon.path, iconBuffer);
      console.log(`✅ Created placeholder icon at ${icon.path}`);
    }
  } catch (error) {
    console.error(`❌ Error creating icon ${icon.path}:`, error);
  }
}

// Create .icns file for macOS if needed
if (process.platform === 'darwin') {
  // For macOS, we'd ideally use a tool like iconutil
  // For this script, we'll just copy an existing .icns or create a placeholder
  const icnsPath = path.join(iconsDir, 'icon.icns');
  const srcIcnsPath = path.join(projectRoot, 'public', 'icons', 'icon.icns');
  
  if (fs.existsSync(srcIcnsPath)) {
    fs.copyFileSync(srcIcnsPath, icnsPath);
    console.log(`✅ Copied ${srcIcnsPath} to ${icnsPath}`);
  } else {
    // Create empty .icns file as placeholder
    // In a real scenario, you'd need a proper tool to create a valid .icns
    fs.writeFileSync(icnsPath, Buffer.alloc(0));
    console.log(`⚠️ Created empty placeholder .icns file at ${icnsPath}`);
    console.log(`   Note: This is not a valid .icns file. Use a proper tool to create one.`);
  }
}

console.log('✅ Icon files prepared successfully');
console.log('✅ All preparations completed successfully!');