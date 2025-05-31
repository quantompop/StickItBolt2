import React, { useState } from 'react';
import { VersionSnapshot } from '../types';
import { History, RefreshCw, Clock, Search, X } from 'lucide-react';
import { useBoard, RESTORE_VERSION } from '../context/BoardContext';

interface VersionHistoryProps {
  onClose: () => void;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({ onClose }) => {
  const { state, dispatch } = useBoard();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Format date from timestamp
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Group versions by date
  const groupVersionsByDate = (versions: VersionSnapshot[]) => {
    const groups: Record<string, VersionSnapshot[]> = {};
    
    versions.forEach(version => {
      const date = new Date(version.timestamp);
      const dateKey = date.toLocaleDateString('en-US', { 
        year: 'numeric',
        month: 'short', 
        day: 'numeric'
      });
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      
      groups[dateKey].push(version);
    });
    
    // Sort each group by timestamp (newest first)
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => b.timestamp - a.timestamp);
    });
    
    return groups;
  };
  
  // Filter versions based on search term
  const filteredVersions = state.versionHistory.filter(version => {
    if (!searchTerm) return true;
    return version.description.toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  // Group filtered versions by date
  const groupedVersions = groupVersionsByDate(filteredVersions);
  const dateKeys = Object.keys(groupedVersions).sort((a, b) => {
    // Sort date keys newest first
    const dateA = new Date(a).getTime();
    const dateB = new Date(b).getTime();
    return dateB - dateA;
  });
  
  // Restore to a specific version
  const handleRestore = (timestamp: number) => {
    if (confirm("Are you sure you want to restore to this version? Your current state will be saved in history.")) {
      dispatch({
        type: RESTORE_VERSION,
        payload: { version: timestamp }
      });
      onClose();
    }
  };
  
  return (
    <div className="h-full overflow-y-auto">
      {/* Search input */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            className="w-full border border-gray-300 rounded px-3 py-2 pl-9 focus:outline-none focus:border-blue-400"
            placeholder="Search version history..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          {searchTerm && (
            <button
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setSearchTerm('')}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      
      {/* Version history list */}
      {dateKeys.length > 0 ? (
        <div className="space-y-6">
          {dateKeys.map(dateKey => (
            <div key={dateKey}>
              <h3 className="text-sm font-medium text-gray-500 mb-2">{dateKey}</h3>
              <div className="space-y-2">
                {groupedVersions[dateKey].map((version) => (
                  <div key={version.timestamp} className="border border-gray-200 rounded p-3 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm text-gray-500 mb-1 flex items-center">
                          <Clock size={14} className="mr-1" />
                          {formatDate(version.timestamp)}
                        </div>
                        <div className="mb-2">{version.description}</div>
                      </div>
                      <button
                        className="text-blue-500 hover:text-blue-600 p-1 flex items-center text-sm"
                        onClick={() => handleRestore(version.timestamp)}
                      >
                        <RefreshCw size={14} className="mr-1" />
                        Restore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500">
          {state.versionHistory.length > 0 
            ? 'No versions match your search'
            : 'No version history yet'}
        </div>
      )}
    </div>
  );
};

export default VersionHistory;