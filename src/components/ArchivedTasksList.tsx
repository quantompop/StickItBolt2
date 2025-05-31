import React, { useState } from 'react';
import { ArchivedTask } from '../types';
import { Trash, RefreshCw, Search, X } from 'lucide-react';
import { useBoard, DELETE_ARCHIVED_TASK, RESTORE_ARCHIVED_TASK } from '../context/BoardContext';

const ArchivedTasksList: React.FC = () => {
  const { state, dispatch } = useBoard();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Delete an archived task
  const handleDelete = (taskId: string) => {
    dispatch({
      type: DELETE_ARCHIVED_TASK,
      payload: { taskId }
    });
  };
  
  // Restore an archived task
  const handleRestore = (taskId: string) => {
    dispatch({
      type: RESTORE_ARCHIVED_TASK,
      payload: { taskId }
    });
  };
  
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
  
  // Filter archived tasks based on search term
  const filteredTasks = state.archivedTasks.filter(task => {
    if (!searchTerm) return true;
    return (
      task.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.noteTitle.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });
  
  // Sort tasks by completion date (newest first)
  const sortedTasks = [...filteredTasks].sort((a, b) => b.completedAt - a.completedAt);
  
  return (
    <div>
      {/* Search input */}
      {state.archivedTasks.length > 0 && (
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 pl-9 focus:outline-none focus:border-blue-400"
              placeholder="Search archived tasks..."
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
      )}
      
      {/* List of archived tasks */}
      {sortedTasks.length > 0 ? (
        <div className="space-y-3">
          {sortedTasks.map((task) => (
            <div key={task.id} className="border border-gray-200 rounded p-3 hover:bg-gray-50">
              <div className="text-sm text-gray-500 mb-1">
                From <span className="font-medium">{task.noteTitle}</span> • {formatDate(task.completedAt)}
              </div>
              <div className="mb-2">{task.text}</div>
              <div className="flex justify-end space-x-2">
                <button
                  className="text-gray-500 hover:text-red-600 p-1"
                  onClick={() => handleDelete(task.id)}
                  aria-label="Delete archived task"
                >
                  <Trash size={16} />
                </button>
                <button
                  className="text-gray-500 hover:text-blue-600 p-1"
                  onClick={() => handleRestore(task.id)}
                  aria-label="Restore archived task"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500">
          {state.archivedTasks.length > 0 
            ? 'No archived tasks match your search'
            : 'No archived tasks yet'}
        </div>
      )}
    </div>
  );
};

export default ArchivedTasksList;