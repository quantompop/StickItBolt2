import React, { useState, useEffect } from 'react';
import { Clock, RefreshCw, Search, X } from 'lucide-react';
import { getBoardBackups, getBackupById } from '../firebase/backup';
import { useBoard, LOAD_BOARD } from '../context/BoardContext';

interface BackupListProps {
  onClose: () => void;
}

const BackupList: React.FC<BackupListProps> = ({ onClose }) => {
  const { state, dispatch } = useBoard();
  const [backups, setBackups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    const loadBackups = async () => {
      if (!state.boardId) return;
      
      try {
        setIsLoading(true);
        setError(null);
        const backupData = await getBoardBackups(state.boardId);
        setBackups(backupData);
      } catch (err: any) {
        console.error('Error loading backups:', err);
        setError(err.message || 'Failed to load backups');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadBackups();
  }, [state.boardId]);
  
  // Filter backups based on search term
  const filteredBackups = backups.filter(backup => {
    if (!searchTerm) return true;
    return backup.description.toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  // Format date from timestamp
  const formatDate = (timestamp: any) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') {
      return 'Unknown date';
    }
    
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Restore from backup
  const handleRestore = async (backupId: string) => {
    if (!confirm("Are you sure you want to restore from this backup? Your current state will be saved first.")) {
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const backup = await getBackupById(backupId);
      
      // Load the backup data
      dispatch({
        type: LOAD_BOARD,
        payload: backup.data
      });
      
      // Close the backup panel
      onClose();
    } catch (err: any) {
      console.error('Error restoring backup:', err);
      setError(err.message || 'Failed to restore backup');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="h-full overflow-y-auto">
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            className="w-full border border-gray-300 rounded px-3 py-2 pl-9 focus:outline-none focus:border-blue-400"
            placeholder="Search backups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          {searchTerm && (
            <button
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setSearchTerm('')}
              aria-label="clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" role="status"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-md">
          {error}
        </div>
      ) : filteredBackups.length > 0 ? (
        <div className="space-y-3">
          {filteredBackups.map((backup) => (
            <div key={backup.id} className="border border-gray-200 rounded p-3 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-gray-500 mb-1 flex items-center">
                    <Clock size={14} className="mr-1" />
                    {formatDate(backup.createdAt)}
                  </div>
                  <div className="mb-2">{backup.description}</div>
                </div>
                <div className="flex space-x-2">
                  <button
                    className="text-blue-500 hover:text-blue-600 p-1 flex items-center text-sm"
                    onClick={() => handleRestore(backup.id)}
                  >
                    <RefreshCw size={14} className="mr-1" />
                    Restore
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500">
          {backups.length > 0 
            ? 'No backups match your search'
            : 'No backups available yet'}
        </div>
      )}
    </div>
  );
};

export default BackupList;