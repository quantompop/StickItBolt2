// Electron preload script - needs to use CommonJS
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
});