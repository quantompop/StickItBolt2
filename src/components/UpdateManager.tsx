import React, { useState, useEffect } from 'react';
import { X, Github, RefreshCw, Check } from 'lucide-react';

interface UpdateManagerProps {
  onClose: () => void;
}

const UpdateManager: React.FC<UpdateManagerProps> = ({ onClose }) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [currentRepo, setCurrentRepo] = useState<{repoUrl: string, owner: string, repo: string} | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Get current repository settings when component mounts
    const getRepoSettings = async () => {
      if (window.electronAPI?.getUpdateRepository) {
        try {
          const repo = await window.electronAPI.getUpdateRepository();
          setCurrentRepo(repo);
          if (repo && repo.repoUrl) {
            setRepoUrl(repo.repoUrl);
          }
        } catch (err) {
          console.error('Error getting repository settings:', err);
        }
      }
    };

    getRepoSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    
    if (!repoUrl.trim()) {
      setError('Please enter a GitHub repository URL');
      return;
    }
    
    // Validate GitHub URL format
    const githubUrlPattern = /^https?:\/\/github\.com\/[\w-]+\/[\w.-]+(\/?|\.git)?$/;
    if (!githubUrlPattern.test(repoUrl)) {
      setError('Please enter a valid GitHub repository URL (e.g., https://github.com/username/repo)');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Use Electron API to save the repository URL for updates
      if (window.electronAPI?.setUpdateRepository) {
        const result = await window.electronAPI.setUpdateRepository(repoUrl);
        
        if (result) {
          // Get the updated repository settings
          if (window.electronAPI?.getUpdateRepository) {
            const repo = await window.electronAPI.getUpdateRepository();
            setCurrentRepo(repo);
          }
          
          setSuccess(true);
        } else {
          throw new Error('Failed to set update repository');
        }
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

  const checkForUpdates = async () => {
    if (!window.electronAPI?.checkForUpdates) {
      setError('Update checking is not available');
      return;
    }
    
    setIsChecking(true);
    setError('');
    
    try {
      await window.electronAPI.checkForUpdates();
    } catch (err: any) {
      console.error('Error checking for updates:', err);
      setError(err.message || 'Failed to check for updates');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Github size={24} className="text-gray-700 mr-2" />
          <h2 className="text-2xl font-bold text-gray-800">Update Settings</h2>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>
      
      {currentRepo?.repoUrl && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <span className="font-medium">Current repository:</span> {currentRepo.owner}/{currentRepo.repo}
          </p>
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center">
          <Check size={16} className="text-green-600 mr-2" />
          <span className="text-green-700 text-sm">
            Update repository set successfully!
          </span>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="repoUrl">
            GitHub Repository URL
          </label>
          <div className="relative">
            <input
              id="repoUrl"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            {isLoading ? 'Setting...' : 'Set Repository'}
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
      
      <div className="mt-6 pt-6 border-t border-gray-200">
        <button
          type="button"
          className={`w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md flex items-center justify-center ${
            isChecking ? 'opacity-70 cursor-not-allowed' : ''
          }`}
          onClick={checkForUpdates}
          disabled={isChecking}
        >
          {isChecking ? (
            <>
              <RefreshCw size={16} className="mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw size={16} className="mr-2" />
              Check for Updates Now
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default UpdateManager;