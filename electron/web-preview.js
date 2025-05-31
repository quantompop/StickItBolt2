import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

// Get __dirname equivalent in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting web preview...');
console.log('📂 Current directory:', process.cwd());
console.log('📂 __dirname:', __dirname);

// Create a simple HTML wrapper that simulates the Electron app
const wrapperHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>StickIt Web Preview (Simulated Desktop App)</title>
  <style>
    body, html {
      height: 100%;
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .electron-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #f0f0f0;
      overflow: hidden;
    }
    .electron-titlebar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #2c2c2c;
      color: white;
      height: 30px;
      padding: 0 10px;
      -webkit-app-region: drag;
    }
    .electron-titlebar-title {
      font-size: 12px;
      font-weight: 500;
    }
    .electron-titlebar-controls {
      display: flex;
    }
    .electron-titlebar-button {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      margin-left: 8px;
      -webkit-app-region: no-drag;
    }
    .electron-titlebar-close { background-color: #ff5f57; }
    .electron-titlebar-minimize { background-color: #ffbd2e; }
    .electron-titlebar-maximize { background-color: #28c940; }
    .electron-content {
      flex: 1;
      position: relative;
      overflow: hidden;
    }
    iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: none;
    }
  </style>
</head>
<body>
  <div class="electron-container">
    <div class="electron-titlebar">
      <div class="electron-titlebar-title">StickIt Desktop (Web Preview)</div>
      <div class="electron-titlebar-controls">
        <div class="electron-titlebar-button electron-titlebar-minimize"></div>
        <div class="electron-titlebar-button electron-titlebar-maximize"></div>
        <div class="electron-titlebar-button electron-titlebar-close"></div>
      </div>
    </div>
    <div class="electron-content">
      <iframe src="./?webpreview=true"></iframe>
    </div>
  </div>
</body>
</html>
`;

// Make sure the dist directory exists
const distDir = join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Save the wrapper HTML
fs.writeFileSync(join(distDir, 'electron-preview.html'), wrapperHtml);
console.log('✅ Created web preview wrapper at: /dist/electron-preview.html');

// Make sure the dist-electron directory exists
const distElectronDir = join(__dirname, '..', 'dist-electron');
if (!fs.existsSync(distElectronDir)) {
  fs.mkdirSync(distElectronDir, { recursive: true });
}

// Copy the main and preload scripts to dist-electron
try {
  // Main script - convert to CommonJS format
  const mainContent = `
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
    icon: path.join(__dirname, '../public/icons/icon.png'),
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
  
  // Write the CommonJS version of main.js
  fs.writeFileSync(join(distElectronDir, 'main.js'), mainContent, 'utf8');
  console.log('✅ CommonJS main.js created at:', join(distElectronDir, 'main.js'));
  
  // Create CommonJS version of preload.js
  const preloadContent = `
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

  // Write the CommonJS version of preload.js
  fs.writeFileSync(join(distElectronDir, 'preload.js'), preloadContent, 'utf8');
  console.log('✅ CommonJS preload.js created at:', join(distElectronDir, 'preload.js'));
  
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