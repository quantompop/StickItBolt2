import React, { useState, useEffect } from 'react';
import Board from './components/Board';
import { BoardProvider } from './context/BoardContext';
import { AuthProvider } from './context/AuthContext';
import AuthModal from './components/Auth/AuthModal';
import { useAuth } from './context/AuthContext';

// Define the window.electronAPI interface
declare global {
  interface Window {
    electronAPI?: {
      getClipboardText: () => Promise<string>;
      onPasteText: (callback: (text: string) => void) => void;
      onNewNote: (callback: () => void) => void;
      onUpdateAvailable: (callback: () => void) => void;
      onUpdateDownloaded: (callback: () => void) => void;
      installUpdate: () => void;
    };
  }
}

const AppContent: React.FC = () => {
  const { state } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [isWebPreview, setIsWebPreview] = useState(false);
  
  // Detect if running in Electron
  const isElectron = !!window.electronAPI;
  
  useEffect(() => {
    // Check if we're running in the web preview
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has('webpreview')) {
      setIsWebPreview(true);
    }

    // Set up Electron IPC event listeners if available
    if (isElectron) {
      // Listen for update notifications
      window.electronAPI!.onUpdateAvailable(() => {
        setShowUpdateBanner(true);
      });
      
      window.electronAPI!.onUpdateDownloaded(() => {
        setUpdateReady(true);
      });
    }
  }, [isElectron]);
  
  // Close auth modal when user successfully authenticates
  useEffect(() => {
    if (state.isAuthenticated) {
      setShowAuthModal(false);
    }
  }, [state.isAuthenticated]);
  
  const handleInstallUpdate = () => {
    if (isElectron && updateReady) {
      window.electronAPI!.installUpdate();
    }
  };
  
  // Show login modal if not authenticated and no boards exist
  useEffect(() => {
    if (!state.isAuthenticated && !state.isLoading) {
      // Only show after initial load
      const timer = setTimeout(() => {
        setShowAuthModal(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [state.isAuthenticated, state.isLoading]);
  
  return (
    <>
      {isWebPreview && (
        <div className="fixed top-0 left-0 right-0 bg-green-600 text-white p-2 z-50 flex justify-between items-center">
          <span>
            Running in Web Preview Mode (Simulated Desktop App)
          </span>
          <a 
            href="/"
            className="bg-white text-green-600 px-3 py-1 rounded text-sm"
          >
            Switch to Standard View
          </a>
        </div>
      )}

      {showUpdateBanner && (
        <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white p-2 z-50 flex justify-between items-center">
          <span>
            {updateReady
              ? "A new version is ready to install!"
              : "A new version is downloading..."}
          </span>
          {updateReady && (
            <button
              onClick={handleInstallUpdate}
              className="bg-white text-blue-600 px-3 py-1 rounded text-sm"
            >
              Install and Restart
            </button>
          )}
        </div>
      )}
      
      <Board />
      
      {/* Authentication Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <BoardProvider>
        <AppContent />
      </BoardProvider>
    </AuthProvider>
  );
}

export default App;