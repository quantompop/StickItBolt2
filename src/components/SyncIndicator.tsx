import React, { useState } from 'react';
import { useBoard } from '../context/BoardContext';
import { RefreshCw, Check, AlertCircle } from 'lucide-react';

interface SyncIndicatorProps {
  className?: string;
}

const SyncIndicator: React.FC<SyncIndicatorProps> = ({ className = '' }) => {
  const { state, syncNow, loadFromServer } = useBoard();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncError(null);
    
    try {
      await syncNow();
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (error: any) {
      console.error('Sync error:', error);
      setSyncError(error.message || 'Failed to sync data');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLoadFromServer = async () => {
    setIsLoading(true);
    setSyncError(null);
    
    try {
      await loadFromServer();
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (error: any) {
      console.error('Load error:', error);
      setSyncError(error.message || 'Failed to load data from server');
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
      
      {syncError && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {syncError}
        </div>
      )}
      
      <div className="flex space-x-2">
        <button
          className="flex-1 flex items-center justify-center px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
          onClick={handleSyncNow}
          disabled={isSyncing}
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
          className="flex-1 flex items-center justify-center px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded text-sm"
          onClick={handleLoadFromServer}
          disabled={isLoading}
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
    </div>
  );
};

export default SyncIndicator;