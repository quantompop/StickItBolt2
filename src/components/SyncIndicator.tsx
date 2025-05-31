import React, { useState, useEffect } from 'react';
import { useBoard } from '../context/BoardContext';
import { useAuth } from '../context/AuthContext';
import { RefreshCw, Check, AlertCircle, Info } from 'lucide-react';

interface SyncIndicatorProps {
  className?: string;
}

const SyncIndicator: React.FC<SyncIndicatorProps> = ({ className = '' }) => {
  const { state, dispatch, syncNow, loadFromServer } = useBoard();
  const { state: authState } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncDetails, setSyncDetails] = useState<string | null>(null);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSyncNow = async () => {
    if (!authState.isAuthenticated) {
      setSyncError("You must be signed in to sync data");
      return;
    }

    if (isOffline) {
      setSyncError("You're offline. Please check your internet connection and try again.");
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    setSyncDetails("Pushing local changes to cloud...");
    
    try {
      await syncNow();
      setLastSyncTime(new Date().toLocaleTimeString());
      setSyncDetails("Sync successful!");
      
      // Clear sync details after a few seconds
      setTimeout(() => {
        setSyncDetails(null);
      }, 3000);
    } catch (error: any) {
      console.error('Sync error:', error);
      setSyncError(error.message || 'Failed to sync data. Please try again.');
      setSyncDetails(null);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLoadFromServer = async () => {
    if (!authState.isAuthenticated) {
      setSyncError("You must be signed in to load data");
      return;
    }

    if (isOffline) {
      setSyncError("You're offline. Please check your internet connection and try again.");
      return;
    }

    if (!confirm("This will overwrite your local changes with data from the cloud. Continue?")) {
      return;
    }

    setIsLoading(true);
    setSyncError(null);
    setSyncDetails("Fetching data from cloud...");
    
    try {
      await loadFromServer();
      setLastSyncTime(new Date().toLocaleTimeString());
      setSyncDetails("Data loaded successfully!");
      
      // Clear sync details after a few seconds
      setTimeout(() => {
        setSyncDetails(null);
      }, 3000);
    } catch (error: any) {
      console.error('Load error:', error);
      setSyncError(error.message || 'Failed to load data from server. Please try again.');
      setSyncDetails(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getLastSyncDisplay = () => {
    if (lastSyncTime) {
      return `Last synced at: ${lastSyncTime}`;
    }
    
    if (state.lastSyncTime) {
      const date = new Date(state.lastSyncTime);
      return `Last synced at: ${date.toLocaleTimeString()}`;
    }
    
    return 'Not synced yet';
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-4 ${className}`}>
      <h3 className="text-lg font-medium mb-2">Sync Status</h3>
      
      {isOffline && (
        <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded flex items-start text-sm">
          <AlertCircle size={16} className="text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
          <span>You're currently offline. Changes will be saved locally and synced when you're back online.</span>
        </div>
      )}
      
      <div className="mb-3 text-sm">
        {state.isSynced ? (
          <div className="flex items-center text-green-600">
            <Check size={16} className="mr-1" />
            Synced with cloud
          </div>
        ) : (
          <div className="flex items-center text-orange-500">
            <AlertCircle size={16} className="mr-1" />
            Not synced with cloud
          </div>
        )}
        <div className="text-gray-600 text-xs mt-1">
          {getLastSyncDisplay()}
        </div>
      </div>

      {!authState.isAuthenticated && (
        <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded flex items-start text-sm">
          <Info size={16} className="text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
          <span>Please sign in to use cloud sync features.</span>
        </div>
      )}
      
      {syncError && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded flex items-start text-sm text-red-600">
          <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
          <span>{syncError}</span>
        </div>
      )}

      {syncDetails && !syncError && (
        <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded flex items-start text-sm text-blue-600">
          <Info size={16} className="mr-2 mt-0.5 flex-shrink-0" />
          <span>{syncDetails}</span>
        </div>
      )}
      
      <div className="flex space-x-2">
        <button
          className="flex-1 flex items-center justify-center px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSyncNow}
          disabled={isSyncing || !authState.isAuthenticated || isOffline}
        >
          {isSyncing ? (
            <>
              <RefreshCw size={14} className="mr-1 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw size={14} className="mr-1" />
              Push to Cloud
            </>
          )}
        </button>
        
        <button
          className="flex-1 flex items-center justify-center px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleLoadFromServer}
          disabled={isLoading || !authState.isAuthenticated || isOffline}
        >
          {isLoading ? (
            <>
              <RefreshCw size={14} className="mr-1 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <RefreshCw size={14} className="mr-1" />
              Pull from Cloud
            </>
          )}
        </button>
      </div>
      
      <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded">
        <h3 className="text-sm font-medium text-blue-800 mb-1">Sync Troubleshooting</h3>
        <ul className="text-xs text-blue-700 list-disc pl-5 space-y-1">
          <li>Make sure you're signed in with the same account on all devices</li>
          <li>Check your internet connection</li>
          <li>Try using "Pull from Cloud" to get the latest data</li>
          <li>Clear your browser cache if you're having persistent issues</li>
          <li>Sign out and sign back in to refresh your authentication</li>
        </ul>
      </div>
    </div>
  );
};

export default SyncIndicator;