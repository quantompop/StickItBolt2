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

// Copy icon files
console.log('📝 Copying icon files...');

// Ensure the destination directory exists
const iconsDir = path.join(projectRoot, 'dist', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Copy icon files
const iconFiles = [
  { src: 'public/icons/icon.ico', dest: 'dist/icons/icon.ico' },
  { src: 'public/icons/icon.png', dest: 'dist/icons/icon.png' }
];

for (const icon of iconFiles) {
  const srcPath = path.join(projectRoot, icon.src);
  const destPath = path.join(projectRoot, icon.dest);
  
  try {
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`✅ Copied ${icon.src} to ${icon.dest}`);
    } else {
      console.warn(`⚠️ Icon file ${icon.src} not found`);
      
      // If source doesn't exist, create a placeholder
      if (icon.src.endsWith('.ico')) {
        console.log('⚠️ Creating placeholder .ico file...');
        // For .ico files, we'll need a different approach
        // Create a small empty file as placeholder
        fs.writeFileSync(destPath, Buffer.alloc(0));
      } else if (icon.src.endsWith('.png')) {
        // Create a minimal valid PNG file as placeholder
        const minimalPNG = Buffer.from('89504E470D0A1A0A0000000D49484452000000100000001008060000001FF3FF610000000970485973000016250000162501495224F00000001C4944415478DA63FCFFFF3F03B9807154030686A8010683803100069E0105A38043CD0000000049454E44AE426082', 'hex');
        fs.writeFileSync(destPath, minimalPNG);
        console.log(`⚠️ Created placeholder PNG at ${icon.dest}`);
      }
    }
  } catch (error) {
    console.error(`❌ Error copying icon ${icon.src}:`, error);
  }
}

console.log('✅ All preparations completed successfully!');