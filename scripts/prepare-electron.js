/**
 * Script to prepare Electron files for packaging
 * This script converts ES modules to CommonJS format for Electron
 */
import { mkdir, writeFile, copyFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const distElectronDir = join(rootDir, 'dist-electron');
const distIconsDir = join(rootDir, 'dist', 'icons');
const publicCssDir = join(rootDir, 'dist', 'public', 'css');

async function ensureDir(dir) {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

async function copyIcons() {
  try {
    const sourceIconsDir = join(rootDir, 'public', 'icons');
    await ensureDir(distIconsDir);
    
    // Copy icon files
    await copyFile(join(sourceIconsDir, 'icon.png'), join(distIconsDir, 'icon.png'));
    console.log('✓ Copied icon.png');
    
    if (existsSync(join(sourceIconsDir, 'icon.ico'))) {
      await copyFile(join(sourceIconsDir, 'icon.ico'), join(distIconsDir, 'icon.ico'));
      console.log('✓ Copied icon.ico');
    }
    
    if (existsSync(join(sourceIconsDir, 'icon.icns'))) {
      await copyFile(join(sourceIconsDir, 'icon.icns'), join(distIconsDir, 'icon.icns'));
      console.log('✓ Copied icon.icns');
    }
  } catch (error) {
    console.error('Error copying icons:', error);
  }
}

async function copyPublicFiles() {
  try {
    // Ensure public CSS directory exists
    await ensureDir(publicCssDir);
    
    // Copy the draft.css file (ensuring the CSS file gets included in the build)
    const sourceCssDir = join(rootDir, 'public', 'css');
    if (existsSync(join(sourceCssDir, 'draft.css'))) {
      await copyFile(join(sourceCssDir, 'draft.css'), join(publicCssDir, 'draft.css'));
      console.log('✓ Copied draft.css');
    }
  } catch (error) {
    console.error('Error copying public files:', error);
  }
}

async function prepareElectronFiles() {
  try {
    // Ensure directories exist
    await ensureDir(distElectronDir);
    
    // Create main.js (CommonJS format)
    const mainContent = `
// This file is in CommonJS format for Electron main process
const { app, BrowserWindow, clipboard, globalShortcut, ipcMain, Menu, shell, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const Store = require('electron-store');

// Initialize electron-store for app config
const store = new Store();

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
        { type: 'separator' },
        {
          label: 'Check for Updates',
          click: () => {
            checkForUpdates();
          }
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

// Custom update repository setting
ipcMain.handle('set-update-repository', async (event, repoUrl) => {
  try {
    // Save the custom repository URL
    const cleanRepoUrl = repoUrl.trim().replace(/\\.git$/, '');
    
    // Extract owner and repo name from the URL
    const urlParts = cleanRepoUrl.split('/');
    const owner = urlParts[urlParts.length - 2];
    const repo = urlParts[urlParts.length - 1];
    
    // Save settings to electron-store
    store.set('updates.customRepository', cleanRepoUrl);
    store.set('updates.owner', owner);
    store.set('updates.repo', repo);
    
    console.log(\`Update repository set to: \${cleanRepoUrl} (\${owner}/\${repo})\`);
    
    // Configure the auto-updater to use the custom repo
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: owner,
      repo: repo
    });
    
    return true;
  } catch (error) {
    console.error('Error setting update repository:', error);
    throw error;
  }
});

// Get the current update repository
ipcMain.handle('get-update-repository', () => {
  return {
    repoUrl: store.get('updates.customRepository'),
    owner: store.get('updates.owner'),
    repo: store.get('updates.repo')
  };
});

// Manually check for updates
ipcMain.handle('check-for-updates', async () => {
  try {
    await checkForUpdates();
    return true;
  } catch (error) {
    console.error('Error checking for updates:', error);
    throw error;
  }
});

function checkForUpdates() {
  if (process.env.ELECTRON_DEV === 'true') {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Updates',
      message: 'Updates are disabled in development mode.'
    });
    return false;
  }

  const customRepo = store.get('updates.customRepository');
  
  if (customRepo) {
    const owner = store.get('updates.owner');
    const repo = store.get('updates.repo');
    
    // Set feed URL with custom repository
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: owner,
      repo: repo
    });
    
    console.log(\`Checking for updates from custom repository: \${owner}/\${repo}\`);
  } else {
    console.log('Using default update repository');
  }

  autoUpdater.checkForUpdates();
  return true;
}

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

  // Check if a custom repository has been set
  const customRepo = store.get('updates.customRepository');
  if (customRepo) {
    const owner = store.get('updates.owner');
    const repo = store.get('updates.repo');
    
    // Configure updater with custom repository
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: owner,
      repo: repo
    });
    
    console.log(\`Using custom update repository: \${owner}/\${repo}\`);
  }

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
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'No Updates',
      message: 'You are running the latest version of StickIt!'
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('Error in auto-updater:', err);
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Update Error',
      message: 'An error occurred while checking for updates.',
      detail: err.toString()
    });
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

    // Create preload.js (CommonJS format)
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
};`;

    // Create package.json for dist-electron without "type": "module"
    const packageJson = {
      name: "stickit-desktop-electron",
      description: "Electron main process",
      main: "main.js",
      private: true
    };

    // Write files
    await writeFile(join(distElectronDir, 'main.js'), mainContent);
    await writeFile(join(distElectronDir, 'preload.js'), preloadContent);
    await writeFile(join(distElectronDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    console.log('✓ Electron files prepared successfully for packaging');
    
    // Copy icon files
    await copyIcons();
    
    // Copy public files
    await copyPublicFiles();
    
  } catch (error) {
    console.error('Error preparing Electron files:', error);
    process.exit(1);
  }
}

// Run the script
console.log('🔄 Preparing Electron files for packaging...');
prepareElectronFiles()
  .then(() => console.log('✅ All preparations completed successfully!'))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });