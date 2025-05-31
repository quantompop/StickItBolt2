import React, { useState } from 'react';
import { Database, Github, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface UpdateManagerProps {
  onClose: () => void;
}

const UpdateManager: React.FC<UpdateManagerProps> = ({ onClose }) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    
    if (!repoUrl.trim()) {
      setError('Please enter a GitHub repository URL');
      return;
    }
    
    // Validate GitHub URL format
    const githubUrlPattern = /^https?:\/\/github\.com\/[\w-]+\/[\w-]+(\.git)?$/;
    if (!githubUrlPattern.test(repoUrl)) {
      setError('Please enter a valid GitHub repository URL (e.g., https://github.com/username/repo)');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Use Electron API to save the repository URL for updates
      // This will be stored in app config and used by electron-updater
      if (window.electronAPI?.setUpdateRepository) {
        await window.electronAPI.setUpdateRepository(repoUrl);
        
        // Try to check for updates immediately
        if (window.electronAPI?.checkForUpdates) {
          await window.electronAPI.checkForUpdates();
        }
        
        setSuccess(true);
        
        // Clear form
        setRepoUrl('');
      } else {
        throw new Error('Update repository feature is not available');
      }
    } catch (err: any) {
      console.error('Error setting update repository:', err);
      setError(err.message || 'Failed to set update repository. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <Github className="h-12 w-12 text-blue-500 mx-auto mb-2" />
        <h2 className="text-2xl font-bold text-gray-800">Update Source</h2>
        <p className="text-gray-600 mt-1">Set GitHub repository for updates</p>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-start">
          <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
          <span className="text-green-700 text-sm">
            Update repository set successfully! The app will now check for updates from this repository.
          </span>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="repoUrl">
            GitHub Repository URL
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Github className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="repoUrl"
              type="text"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://github.com/username/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              required
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            The repository must be public and have releases configured with electron-builder.
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            type="submit"
            className={`flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md ${
              isLoading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <RefreshCw className="inline-block mr-1 h-4 w-4 animate-spin" />
                Setting...
              </>
            ) : 'Set Repository'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-md"
          >
            Cancel
          </button>
        </div>
      </form>
      
      {window.electronAPI?.getUpdateRepository && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            type="button"
            className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md flex items-center justify-center"
            onClick={async () => {
              if (window.electronAPI?.checkForUpdates) {
                setIsLoading(true);
                try {
                  await window.electronAPI.checkForUpdates();
                } catch (err) {
                  console.error('Error checking for updates:', err);
                } finally {
                  setIsLoading(false);
                }
              }
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Check for Updates Now
          </button>
        </div>
      )}
    </div>
  );
};

export default UpdateManager;