import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash, Download, Archive, Search, X, History, 
  Undo, Database, LogOut, Key, Github, RefreshCw
} from 'lucide-react';
import Note from './Note';
import ArchivedTasksList from './ArchivedTasksList';
import VersionHistory from './VersionHistory';
import BackupList from './BackupList';
import { useBoard, ADD_NOTE, SET_SEARCH, CLEAR_SEARCH, SAVE_VERSION, UNDO } from '../context/BoardContext';
import { createBackup } from '../firebase/backup';
import { useAuth } from '../context/AuthContext';
import { signOut } from '../firebase/authService';
import { NoteColor } from '../types';
import AuthModal from './Auth/AuthModal';
import UpdateManager from './UpdateManager';

const Board: React.FC = () => {
  const { state, dispatch } = useBoard();
  const { state: authState } = useAuth();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showBackups, setShowBackups] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showUpdateManager, setShowUpdateManager] = useState(false);
  
  // Initialize the state to ensure it has expected properties
  useEffect(() => {
    if (!state.notes) {
      dispatch({
        type: 'LOAD_BOARD',
        payload: {
          ...state,
          notes: [],
          archivedTasks: [],
          search: {
            term: '',
            isActive: false,
            scope: 'global',
            noteId: null
          },
          versionHistory: [],
          undoStack: []
        }
      });
    }
  }, [state]);
  
  // Add a new note with random position
  const handleAddNote = (color: string = 'yellow') => {
    // Calculate a position that's visible on the board
    const position = {
      x: 100 + Math.random() * 100,
      y: 100 + Math.random() * 100
    };
    
    dispatch({
      type: ADD_NOTE,
      payload: { color, position }
    });
    
    setShowColorPicker(false);
  };
  
  // Toggle archive panel
  const toggleArchive = () => {
    setShowArchive(!showArchive);
    // Close other panels
    if (showGlobalSearch) setShowGlobalSearch(false);
    if (showVersionHistory) setShowVersionHistory(false);
    if (showBackups) setShowBackups(false);
  };
  
  // Toggle version history panel
  const toggleVersionHistory = () => {
    setShowVersionHistory(!showVersionHistory);
    // Close other panels
    if (showGlobalSearch) setShowGlobalSearch(false);
    if (showArchive) setShowArchive(false);
    if (showBackups) setShowBackups(false);
  };

  // Toggle backups panel
  const toggleBackups = () => {
    setShowBackups(!showBackups);
    // Close other panels
    if (showGlobalSearch) setShowGlobalSearch(false);
    if (showArchive) setShowArchive(false);
    if (showVersionHistory) setShowVersionHistory(false);
  };
  
  // Toggle global search panel
  const toggleGlobalSearch = () => {
    setShowGlobalSearch(!showGlobalSearch);
    // Close other panels
    if (showArchive) setShowArchive(false);
    if (showVersionHistory) setShowVersionHistory(false);
    if (showBackups) setShowBackups(false);
  };
  
  // Perform global search
  const handleGlobalSearch = () => {
    if (globalSearchTerm.trim()) {
      dispatch({
        type: SET_SEARCH,
        payload: { 
          term: globalSearchTerm, 
          scope: 'global'
        }
      });
    }
  };
  
  // Clear global search
  const clearGlobalSearch = () => {
    setGlobalSearchTerm('');
    dispatch({
      type: CLEAR_SEARCH
    });
  };
  
  // Handle key press in search input
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleGlobalSearch();
    } else if (e.key === 'Escape') {
      clearGlobalSearch();
      setShowGlobalSearch(false);
    }
  };
  
  // Create manual version snapshot
  const createVersionSnapshot = () => {
    const description = prompt("Enter a description for this version:");
    if (description) {
      dispatch({
        type: SAVE_VERSION,
        payload: { description }
      });
      alert("Version saved successfully!");
    }
  };
  
  // Handle undo action
  const handleUndo = () => {
    if (state.undoStack && state.undoStack.length > 0) {
      dispatch({
        type: UNDO
      });
    } else {
      alert("Nothing to undo!");
    }
  };

  // Create backup
  const handleCreateBackup = async () => {
    if (!authState.isAuthenticated || !authState.user) {
      alert("Please sign in to create backups");
      return;
    }
    
    if (!state.boardId) {
      alert("No board ID available");
      return;
    }
    
    try {
      setIsCreatingBackup(true);
      const description = prompt("Enter a description for this backup:") || "Manual backup";
      
      // Create a backup copy of the current board state
      await createBackup(authState.user.id, state.boardId, {
        ...state,
        description
      });
      
      alert("Backup created successfully!");
      
      // Refresh backups if panel is open
      if (showBackups) {
        setShowBackups(false);
        setTimeout(() => setShowBackups(true), 100);
      }
    } catch (error) {
      console.error("Error creating backup:", error);
      alert("Failed to create backup. Please try again.");
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // Open change password modal
  const handleChangePassword = () => {
    setShowPasswordModal(true);
  };

  // Open update manager
  const handleOpenUpdateManager = () => {
    setShowUpdateManager(true);
  };
  
  // Handle signing out
  const handleSignOut = async () => {
    if (confirm("Are you sure you want to sign out?")) {
      try {
        await signOut();
      } catch (error) {
        console.error("Error signing out:", error);
        alert("Failed to sign out. Please try again.");
      }
    }
  };
  
  // Handle task drop directly on the board background
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  // Colors for the quick add buttons - basic palette
  const basicColors: {name: NoteColor, label: string}[] = [
    { name: 'yellow', label: 'Yellow' },
    { name: 'blue', label: 'Blue' },
    { name: 'green', label: 'Green' },
    { name: 'pink', label: 'Pink' },
    { name: 'purple', label: 'Purple' },
    { name: 'orange', label: 'Orange' },
    { name: 'red', label: 'Red' }
  ];
  
  // Extended palette
  const extendedColors: {name: NoteColor, label: string}[] = [
    { name: 'teal', label: 'Teal' },
    { name: 'indigo', label: 'Indigo' },
    { name: 'lime', label: 'Lime' },
    { name: 'amber', label: 'Amber' },
    { name: 'cyan', label: 'Cyan' },
    { name: 'rose', label: 'Rose' },
    { name: 'sky', label: 'Sky' },
    { name: 'emerald', label: 'Emerald' },
    { name: 'fuchsia', label: 'Fuchsia' },
    { name: 'violet', label: 'Violet' },
    { name: 'gray', label: 'Gray' }
  ];

  // Set up automatic backups
  useEffect(() => {
    const createAutomaticBackup = async () => {
      if (authState.isAuthenticated && authState.user && state.boardId) {
        try {
          await createBackup(
            authState.user.id, 
            state.boardId, 
            state
          );
          console.log("Automatic backup created successfully");
        } catch (error) {
          console.error("Error creating automatic backup:", error);
        }
      }
    };

    // Create a backup every hour if the user is authenticated
    const backupInterval = setInterval(() => {
      createAutomaticBackup();
    }, 60 * 60 * 1000); // 1 hour

    return () => clearInterval(backupInterval);
  }, [authState.isAuthenticated, authState.user, state.boardId]);
  
  return (
    <div 
      className="h-screen w-full bg-gray-100 relative overflow-hidden"
      onDragOver={handleDragOver}
    >
      {/* Board Toolbar */}
      <div className="absolute top-0 left-0 right-0 bg-white shadow-sm z-10 p-3 flex items-center toolbar-container">
        <div className="flex-grow flex items-center">
          <h1 className="text-xl font-semibold text-gray-800">StickIt Board</h1>
          
          {/* Display user email when logged in */}
          {authState.isAuthenticated && authState.user && (
            <div className="ml-4 text-sm text-gray-600 flex items-center">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                {authState.user.email}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex space-x-2 flex-wrap">
          <div className="relative">
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded flex items-center transition-colors toolbar-button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              aria-label="Add a new note"
            >
              <Plus size={18} />
              <span className="ml-1">Add Note</span>
            </button>
            
            {/* Color picker dropdown */}
            {showColorPicker && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded shadow-lg p-3 z-20 max-h-[calc(100vh-100px)] overflow-y-auto">
                <div className="w-64">
                  <div className="text-sm font-medium text-gray-700 mb-2">Basic Colors</div>
                  <div className="grid grid-cols-4 gap-1 mb-4">
                    {basicColors.map(color => (
                      <button
                        key={color.name}
                        className={`px-3 py-2 rounded text-sm hover:bg-gray-100 text-left transition-colors`}
                        onClick={() => handleAddNote(color.name)}
                      >
                        {color.label}
                      </button>
                    ))}
                  </div>
                  
                  <div className="text-sm font-medium text-gray-700 mb-2">Extended Colors</div>
                  <div className="grid grid-cols-4 gap-1">
                    {extendedColors.map(color => (
                      <button
                        key={color.name}
                        className={`px-3 py-2 rounded text-sm hover:bg-gray-100 text-left transition-colors`}
                        onClick={() => handleAddNote(color.name)}
                      >
                        {color.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <button 
            className={`${
              showArchive 
                ? 'bg-blue-100 text-blue-600' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            } px-3 py-1.5 rounded flex items-center transition-colors toolbar-button`}
            onClick={toggleArchive}
            aria-label="Show archived tasks"
          >
            <Archive size={18} />
            <span className="ml-1">Archive</span>
            {(state.archivedTasks || []).length > 0 && (
              <span className="ml-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {state.archivedTasks.length}
              </span>
            )}
          </button>
          
          <button 
            className={`${
              showGlobalSearch || state.search?.isActive
                ? 'bg-blue-100 text-blue-600' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            } px-3 py-1.5 rounded flex items-center transition-colors toolbar-button`}
            onClick={toggleGlobalSearch}
            aria-label="Search tasks and notes"
          >
            <Search size={18} />
            <span className="ml-1">Search</span>
          </button>
          
          <button 
            className={`${
              showVersionHistory 
                ? 'bg-blue-100 text-blue-600' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            } px-3 py-1.5 rounded flex items-center transition-colors toolbar-button`}
            onClick={toggleVersionHistory}
            aria-label="View version history"
          >
            <History size={18} />
            <span className="ml-1">History</span>
            {(state.versionHistory || []).length > 0 && (
              <span className="ml-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {state.versionHistory.length}
              </span>
            )}
          </button>
          
          <button 
            className={`${
              showBackups 
                ? 'bg-blue-100 text-blue-600' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            } px-3 py-1.5 rounded flex items-center transition-colors toolbar-button`}
            onClick={toggleBackups}
            aria-label="Manage backups"
          >
            <Database size={18} />
            <span className="ml-1">Backups</span>
          </button>
          
          <button 
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded flex items-center transition-colors toolbar-button"
            onClick={handleUndo}
            title="Undo last action"
            aria-label="Undo last action"
          >
            <Undo size={18} />
            <span className="ml-1">Undo</span>
            {state.undoStack && state.undoStack.length > 0 && (
              <span className="ml-1 bg-gray-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {state.undoStack.length}
              </span>
            )}
          </button>
          
          <div className="relative">
            <button 
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded flex items-center transition-colors toolbar-button"
              onClick={createVersionSnapshot}
              aria-label="Save current version"
            >
              <Download size={18} />
              <span className="ml-1">Save Version</span>
            </button>
          </div>
          
          <div className="relative">
            <button 
              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded flex items-center transition-colors toolbar-button"
              onClick={handleCreateBackup}
              disabled={isCreatingBackup || !authState.isAuthenticated}
              aria-label="Create a backup"
            >
              <Database size={18} />
              <span className="ml-1">{isCreatingBackup ? 'Saving...' : 'Create Backup'}</span>
            </button>
          </div>

          {/* Update Manager Button - new button for update repository */}
          <button 
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded flex items-center transition-colors toolbar-button"
            onClick={handleOpenUpdateManager}
            aria-label="Set update repository"
          >
            <Github size={18} />
            <span className="ml-1">Updates</span>
          </button>
          
          {/* User Account Actions */}
          {authState.isAuthenticated && (
            <>
              {/* Change Password Button */}
              <button 
                className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 rounded flex items-center transition-colors toolbar-button"
                onClick={handleChangePassword}
                aria-label="Change password"
              >
                <Key size={18} />
                <span className="ml-1">Password</span>
              </button>
              
              {/* Log Out Button */}
              <button 
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded flex items-center transition-colors toolbar-button"
                onClick={handleSignOut}
                aria-label="Sign out of your account"
              >
                <LogOut size={18} />
                <span className="ml-1">Sign Out</span>
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Global Search Panel */}
      {showGlobalSearch && (
        <div className="absolute top-14 right-0 bg-white shadow-lg z-20 p-4 w-80 rounded-l-lg border-l border-t border-b border-gray-200 max-h-[calc(100vh-56px)] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Global Search</h2>
            <button 
              className="text-gray-500 hover:text-gray-700"
              onClick={toggleGlobalSearch}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          
          <div className="mb-4">
            <div className="flex mb-2">
              <input
                type="text"
                className="flex-grow border border-gray-300 rounded-l px-3 py-2 focus:outline-none focus:border-blue-400"
                placeholder="Search all notes..."
                value={globalSearchTerm}
                onChange={(e) => setGlobalSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-r transition-colors"
                onClick={handleGlobalSearch}
                aria-label="Search"
              >
                <Search size={18} />
              </button>
            </div>
            
            {state.search && state.search.isActive && (
              <div className="flex justify-between items-center px-3 py-2 bg-blue-50 rounded text-sm">
                <span>Showing results for "{state.search.term}"</span>
                <button 
                  className="text-gray-500 hover:text-gray-700"
                  onClick={clearGlobalSearch}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
          
          {state.search && state.search.isActive && state.search.scope === 'global' && (
            <div>
              <h3 className="font-medium mb-2">Search Results</h3>
              <div className="space-y-3 search-results">
                {(state.notes || []).map(note => {
                  const matchingTasks = (note.tasks || []).filter(
                    task => task.text.toLowerCase().includes(state.search.term.toLowerCase())
                  );
                  
                  if (matchingTasks.length === 0) return null;
                  
                  return (
                    <div key={note.id} className="border border-gray-200 rounded p-2">
                      <div className="font-medium mb-1">{note.title}</div>
                      {matchingTasks.map(task => (
                        <div key={task.id} className="pl-2 py-1 text-sm border-l-2 border-blue-400">
                          {task.text}
                        </div>
                      ))}
                    </div>
                  );
                })}
                
                {/* Check if there are any results */}
                {(state.notes || []).every(note => 
                  !(note.tasks || []).some(task => 
                    task.text.toLowerCase().includes(state.search.term.toLowerCase())
                  )
                ) && (
                  <div className="text-center py-4 text-gray-500">
                    No matching tasks found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Archive Panel */}
      {showArchive && (
        <div className="absolute top-14 right-0 bg-white shadow-lg z-20 p-4 w-80 rounded-l-lg border-l border-t border-b border-gray-200 max-h-[calc(100vh-56px)] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Archived Tasks</h2>
            <button 
              className="text-gray-500 hover:text-gray-700"
              onClick={toggleArchive}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          
          <ArchivedTasksList />
        </div>
      )}
      
      {/* Version History Panel */}
      {showVersionHistory && (
        <div className="absolute top-14 right-0 bg-white shadow-lg z-20 p-4 w-80 rounded-l-lg border-l border-t border-b border-gray-200 max-h-[calc(100vh-56px)] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Version History</h2>
            <button 
              className="text-gray-500 hover:text-gray-700"
              onClick={toggleVersionHistory}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          
          <VersionHistory onClose={toggleVersionHistory} />
        </div>
      )}
      
      {/* Backups Panel */}
      {showBackups && (
        <div className="absolute top-14 right-0 bg-white shadow-lg z-20 p-4 w-80 rounded-l-lg border-l border-t border-b border-gray-200 max-h-[calc(100vh-56px)] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Cloud Backups</h2>
            <button 
              className="text-gray-500 hover:text-gray-700"
              onClick={toggleBackups}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          
          {!authState.isAuthenticated ? (
            <div className="bg-yellow-50 text-yellow-800 p-3 rounded-md">
              Please sign in to access cloud backups
            </div>
          ) : (
            <BackupList onClose={toggleBackups} />
          )}
        </div>
      )}
      
      {/* Notes container */}
      <div className="pt-16 h-full w-full">
        {(state.notes || []).map((note) => (
          <Note key={note.id} note={note} />
        ))}
        
        {/* Empty state */}
        {(!state.notes || state.notes.length === 0) && (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <div className="mb-4 text-blue-500">
              <Plus size={48} />
            </div>
            <p className="text-xl font-medium mb-2">Your board is empty</p>
            <p className="mb-4">Click the "Add Note" button to get started</p>
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
              onClick={() => handleAddNote()}
            >
              Add your first note
            </button>
          </div>
        )}
      </div>

      {/* Password Change Modal */}
      <AuthModal 
        isOpen={showPasswordModal} 
        onClose={() => setShowPasswordModal(false)}
        initialMode="password" 
      />

      {/* Update Manager Modal */}
      {showUpdateManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" role="dialog" aria-modal="true">
          <div className="relative">
            <UpdateManager onClose={() => setShowUpdateManager(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Board;