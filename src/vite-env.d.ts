/// <reference types="vite/client" />

interface Window {
  electronAPI?: {
    getClipboardText: () => Promise<string>;
    onPasteText: (callback: (text: string) => void) => () => void;
    onNewNote: (callback: () => void) => () => void;
    onUpdateAvailable: (callback: () => void) => () => void;
    onUpdateDownloaded: (callback: () => void) => () => void;
    installUpdate: () => void;
    setUpdateRepository: (repoUrl: string) => Promise<boolean>;
    getUpdateRepository: () => Promise<{repoUrl: string, owner: string, repo: string}>;
    checkForUpdates: () => Promise<boolean>;
  };
  global: any;
}