import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { Note, Task, BoardState, ArchivedTask, VersionSnapshot, TaskPriority } from '../types';
import { generateId } from '../utils/helpers';
import { useAuth } from './AuthContext';
import { saveBoardState, getBoardState } from '../firebase/storageService';
import { createBackup } from '../firebase/backup';
import { v4 as uuidv4 } from 'uuid';

// Initial board state
const initialState: BoardState = {
  boardId: uuidv4(),
  notes: [],
  archivedTasks: [],
  draggedTask: {
    taskId: null,
    noteId: null,
    isDragging: false
  },
  search: {
    term: '',
    isActive: false,
    scope: 'global',
    noteId: null
  },
  versionHistory: [],
  undoStack: [],
  isSynced: false,
  lastSyncTime: 0
};

// Create the context
const BoardContext = createContext<{
  state: BoardState;
  dispatch: React.Dispatch<any>;
}>({
  state: initialState,
  dispatch: () => null
});

// Action types
export const ADD_NOTE = 'ADD_NOTE';
export const UPDATE_NOTE = 'UPDATE_NOTE';
export const DELETE_NOTE = 'DELETE_NOTE';
export const MOVE_NOTE = 'MOVE_NOTE';
export const CHANGE_NOTE_COLOR = 'CHANGE_NOTE_COLOR';
export const ADD_TASK = 'ADD_TASK';
export const UPDATE_TASK = 'UPDATE_TASK';
export const DELETE_TASK = 'DELETE_TASK';
export const TOGGLE_TASK = 'TOGGLE_TASK';
export const MOVE_TASK = 'MOVE_TASK';
export const INDENT_TASK = 'INDENT_TASK';
export const SET_DRAGGED_TASK = 'SET_DRAGGED_TASK';
export const REORDER_TASK = 'REORDER_TASK';
export const CHANGE_TEXT_SIZE = 'CHANGE_TEXT_SIZE';
export const CHANGE_TASK_SPACING = 'CHANGE_TASK_SPACING';
export const ARCHIVE_TASK = 'ARCHIVE_TASK';
export const DELETE_ARCHIVED_TASK = 'DELETE_ARCHIVED_TASK';
export const RESTORE_ARCHIVED_TASK = 'RESTORE_ARCHIVED_TASK';
export const SET_SEARCH = 'SET_SEARCH';
export const CLEAR_SEARCH = 'CLEAR_SEARCH';
export const SAVE_VERSION = 'SAVE_VERSION';
export const RESTORE_VERSION = 'RESTORE_VERSION';
export const SET_TASK_PRIORITY = 'SET_TASK_PRIORITY';
export const UNDO = 'UNDO';
export const SYNC_BOARD = 'SYNC_BOARD';
export const LOAD_BOARD = 'LOAD_BOARD';

// Create a version snapshot
const createVersionSnapshot = (state: BoardState, description: string): VersionSnapshot => {
  // Create a deep copy of the state without version history to avoid nesting
  const { versionHistory, undoStack, ...stateWithoutHistory } = state;
  
  return {
    timestamp: Date.now(),
    data: stateWithoutHistory as BoardState,
    description
  };
};

// Add action to undo stack
const addToUndoStack = (state: BoardState, action: any) => {
  // Don't add certain actions to undo stack
  const actionsToSkip = [SET_DRAGGED_TASK, UNDO, RESTORE_VERSION, SAVE_VERSION, SYNC_BOARD, LOAD_BOARD];
  
  if (actionsToSkip.includes(action.type)) {
    return state.undoStack || [];
  }
  
  const newUndoAction = {
    type: action.type,
    payload: action.payload,
    timestamp: Date.now()
  };
  
  // Keep max 20 actions in undo stack
  const maxUndoStack = 20;
  const newUndoStack = [newUndoAction, ...(state.undoStack || [])];
  
  if (newUndoStack.length > maxUndoStack) {
    return newUndoStack.slice(0, maxUndoStack);
  }
  
  return newUndoStack;
};

// Reducer function
export const boardReducer = (state: BoardState = initialState, action: any): BoardState => {
  let newState: BoardState;
  
  switch (action.type) {
    case LOAD_BOARD:
      return {
        ...action.payload,
        lastSyncTime: Date.now()
      };
      
    case ADD_NOTE: {
      const title = action.payload.title || 'New Note';
      
      const newNote: Note = {
        id: generateId(),
        title,
        color: action.payload.color || 'yellow',
        tasks: [],
        position: action.payload.position || { x: 100, y: 100 },
        textSize: 14, // Default text size
        taskSpacing: 8 // Default task spacing
      };
      
      newState = {
        ...state,
        notes: [...(state.notes || []), newNote],
        undoStack: addToUndoStack(state, action)
      };
      
      // Create a version snapshot
      const snapshot = createVersionSnapshot(newState, `Added new note: ${newNote.title}`);
      newState.versionHistory = [...(state.versionHistory || []), snapshot];
      
      return newState;
    }
    
    case UPDATE_NOTE: {
      const { id, title } = action.payload;
      const updatedTitle = title.trim() ? title : 'Untitled Note';
      
      newState = {
        ...state,
        notes: (state.notes || []).map(note => 
          note.id === id ? { ...note, title: updatedTitle } : note
        ),
        undoStack: addToUndoStack(state, action)
      };
      
      // Create a version snapshot
      const snapshot = createVersionSnapshot(newState, `Renamed note to: ${updatedTitle}`);
      newState.versionHistory = [...(state.versionHistory || []), snapshot];
      
      return newState;
    }
    
    case DELETE_NOTE: {
      const noteToDelete = (state.notes || []).find(note => note.id === action.payload.id);
      
      newState = {
        ...state,
        notes: (state.notes || []).filter(note => note.id !== action.payload.id),
        undoStack: addToUndoStack(state, action)
      };
      
      // Create a version snapshot
      const snapshot = createVersionSnapshot(newState, `Deleted note: ${noteToDelete?.title || 'Unknown'}`);
      newState.versionHistory = [...(state.versionHistory || []), snapshot];
      
      return newState;
    }
    
    case MOVE_NOTE: {
      const { id, position } = action.payload;
      
      newState = {
        ...state,
        notes: (state.notes || []).map(note => 
          note.id === id ? { ...note, position } : note
        )
      };
      
      // We don't create a version snapshot for move operations to avoid cluttering history
      return newState;
    }
    
    case CHANGE_NOTE_COLOR: {
      const { id, color } = action.payload;
      
      newState = {
        ...state,
        notes: (state.notes || []).map(note => 
          note.id === id ? { ...note, color } : note
        ),
        undoStack: addToUndoStack(state, action)
      };
      
      // Create a version snapshot
      const noteTitle = (state.notes || []).find(note => note.id === id)?.title;
      const snapshot = createVersionSnapshot(newState, `Changed color of note: ${noteTitle || 'Unknown'}`);
      newState.versionHistory = [...(state.versionHistory || []), snapshot];
      
      return newState;
    }
    
    case ADD_TASK: {
      const { noteId, text } = action.payload;
      
      // Only add task if text is not empty
      if (!text || !text.trim()) {
        return state;
      }
      
      const newTask: Task = {
        id: generateId(),
        text,
        completed: false,
        indentation: 0,
        priority: 'none'
      };
      
      newState = {
        ...state,
        notes: (state.notes || []).map(note => 
          note.id === noteId
            ? { ...note, tasks: [...(note.tasks || []), newTask] }
            : note
        ),
        undoStack: addToUndoStack(state, action)
      };
      
      // Create a version snapshot
      const noteTitle = (state.notes || []).find(note => note.id === noteId)?.title;
      const snapshot = createVersionSnapshot(newState, `Added task to ${noteTitle || 'Unknown'}: ${text.substring(0, 20)}${text.length > 20 ? '...' : ''}`);
      newState.versionHistory = [...(state.versionHistory || []), snapshot];
      
      return newState;
    }
    
    case UPDATE_TASK: {
      const { noteId, taskId, text } = action.payload;
      
      newState = {
        ...state,
        notes: (state.notes || []).map(note => 
          note.id === noteId
            ? {
                ...note,
                tasks: (note.tasks || []).map(task => 
                  task.id === taskId ? { ...task, text } : task
                )
              }
            : note
        ),
        undoStack: addToUndoStack(state, action)
      };
      
      // Create a version snapshot
      const noteTitle = (state.notes || []).find(note => note.id === noteId)?.title;
      const snapshot = createVersionSnapshot(newState, `Updated task in ${noteTitle || 'Unknown'}: ${text.substring(0, 20)}${text.length > 20 ? '...' : ''}`);
      newState.versionHistory = [...(state.versionHistory || []), snapshot];
      
      return newState;
    }
    
    case SET_TASK_PRIORITY: {
      const { noteId, taskId, priority } = action.payload;
      
      newState = {
        ...state,
        notes: (state.notes || []).map(note => 
          note.id === noteId
            ? {
                ...note,
                tasks: (note.tasks || []).map(task => 
                  task.id === taskId ? { ...task, priority } : task
                )
              }
            : note
        ),
        undoStack: addToUndoStack(state, action)
      };
      
      // Create a version snapshot
      const noteTitle = (state.notes || []).find(note => note.id === noteId)?.title;
      const taskText = (state.notes || []).find(note => note.id === noteId)?.tasks.find(task => task.id === taskId)?.text || 'Unknown';
      const snapshot = createVersionSnapshot(newState, `Set priority ${priority} for task in ${noteTitle || 'Unknown'}: ${taskText.substring(0, 20)}${taskText.length > 20 ? '...' : ''}`);
      newState.versionHistory = [...(state.versionHistory || []), snapshot];
      
      return newState;
    }
    
    case DELETE_TASK: {
      const { noteId, taskId } = action.payload;
      
      // Find the task text for the version history description
      const note = (state.notes || []).find(n => n.id === noteId);
      const taskText = note?.tasks?.find(t => t.id === taskId)?.text || 'Unknown task';
      
      newState = {
        ...state,
        notes: (state.notes || []).map(note => 
          note.id === noteId
            ? {
                ...note,
                tasks: (note.tasks || []).filter(task => task.id !== taskId)
              }
            : note
        ),
        undoStack: addToUndoStack(state, action)
      };
      
      // Create a version snapshot
      const snapshot = createVersionSnapshot(newState, `Deleted task from ${note?.title || 'Unknown'}: ${taskText.substring(0, 20)}${taskText.length > 20 ? '...' : ''}`);
      newState.versionHistory = [...(state.versionHistory || []), snapshot];
      
      return newState;
    }
    
    case TOGGLE_TASK: {
      const { noteId, taskId } = action.payload;
      
      // Find the note and task
      const note = (state.notes || []).find(n => n.id === noteId);
      if (!note) return state;
      
      const task = (note.tasks || []).find(t => t.id === taskId);
      if (!task) return state;
      
      // If task is already completed, just toggle it back
      if (task.completed) {
        newState = {
          ...state,
          notes: (state.notes || []).map(note => 
            note.id === noteId
              ? {
                  ...note,
                  tasks: (note.tasks || []).map(task => 
                    task.id === taskId ? { ...task, completed: false } : task
                  )
                }
              : note
          ),
          undoStack: addToUndoStack(state, action)
        };
        
        // Create a version snapshot
        const snapshot = createVersionSnapshot(newState, `Marked task as incomplete in ${note.title}: ${task.text.substring(0, 20)}${task.text.length > 20 ? '...' : ''}`);
        newState.versionHistory = [...(state.versionHistory || []), snapshot];
        
        return newState;
      }
      
      // If task is being completed, archive it
      const archivedTask: ArchivedTask = {
        id: generateId(),
        text: task.text,
        noteId: noteId,
        noteTitle: note.title,
        completedAt: Date.now()
      };
      
      newState = {
        ...state,
        archivedTasks: [...(state.archivedTasks || []), archivedTask],
        notes: (state.notes || []).map(note => 
          note.id === noteId
            ? {
                ...note,
                tasks: (note.tasks || []).filter(task => task.id !== taskId)
              }
            : note
        ),
        undoStack: addToUndoStack(state, action)
      };
      
      // Create a version snapshot
      const snapshot = createVersionSnapshot(newState, `Completed and archived task from ${note.title}: ${task.text.substring(0, 20)}${task.text.length > 20 ? '...' : ''}`);
      newState.versionHistory = [...(state.versionHistory || []), snapshot];
      
      return newState;
    }
    
    case MOVE_TASK: {
      const { sourceNoteId, targetNoteId, taskId, hasSubtasks, subtaskIndices } = action.payload;
      
      // Find the source note
      const sourceNote = (state.notes || []).find(note => note.id === sourceNoteId);
      if (!sourceNote) return state;
      
      // Find the task to move
      const taskIndex = (sourceNote.tasks || []).findIndex(task => task.id === taskId);
      if (taskIndex === -1) return state;
      
      const taskToMove = sourceNote.tasks[taskIndex];
      
      // Find target note
      const targetNote = (state.notes || []).find(note => note.id === targetNoteId);
      if (!targetNote) return state;
      
      // If task has subtasks, move them as well
      let tasksToMove = [taskToMove];
      let remainingTasks = [...(sourceNote.tasks || [])];
      
      if (hasSubtasks && Array.isArray(subtaskIndices) && subtaskIndices.length > 0) {
        // Get all tasks to move (main task + subtasks)
        tasksToMove = [
          taskToMove, 
          ...subtaskIndices.map(index => sourceNote.tasks[index])
        ];
        
        // Remove all moved tasks from the source
        const taskIdsToMove = tasksToMove.map(task => task.id);
        remainingTasks = (sourceNote.tasks || []).filter(task => !taskIdsToMove.includes(task.id));
      } else {
        // Just remove the single task
        remainingTasks.splice(taskIndex, 1);
      }
      
      // Remove task from source note and add to target note
      newState = {
        ...state,
        notes: (state.notes || []).map(note => {
          if (note.id === sourceNoteId) {
            return {
              ...note,
              tasks: remainingTasks
            };
          }
          if (note.id === targetNoteId) {
            return {
              ...note,
              tasks: [...(note.tasks || []), ...tasksToMove]
            };
          }
          return note;
        }),
        undoStack: addToUndoStack(state, action)
      };
      
      // Create a version snapshot
      const snapshot = createVersionSnapshot(
        newState, 
        `Moved task${hasSubtasks ? 's' : ''} from "${sourceNote.title}" to "${targetNote.title}": ${taskToMove.text.substring(0, 20)}${taskToMove.text.length > 20 ? '...' : ''}`
      );
      newState.versionHistory = [...(state.versionHistory || []), snapshot];
      
      return newState;
    }
    
    case INDENT_TASK: {
      const { noteId, taskId, direction } = action.payload;
      
      // Limit indentation to a reasonable value (0-10)
      const MAX_INDENTATION = 10;
      
      newState = {
        ...state,
        notes: (state.notes || []).map(note => 
          note.id === noteId
            ? {
                ...note,
                tasks: (note.tasks || []).map(task => {
                  if (task.id === taskId) {
                    const newIndentation = task.indentation + (direction === 'right' ? 1 : -1);
                    return {
                      ...task,
                      indentation: Math.min(Math.max(0, newIndentation), MAX_INDENTATION)
                    };
                  }
                  return task;
                })
              }
            : note
        ),
        undoStack: addToUndoStack(state, action)
      };
      
      // We don't create a version snapshot for indent operations to avoid cluttering history
      return newState;
    }
    
    case SET_DRAGGED_TASK: {
      return {
        ...state,
        draggedTask: {
          taskId: action.payload.taskId,
          noteId: action.payload.noteId,
          isDragging: action.payload.isDragging
        }
      };
    }
    
    case REORDER_TASK: {
      const { noteId, sourceIndex, targetIndex, hasSubtasks, subtaskIndices } = action.payload;
      const noteToUpdate = (state.notes || []).find(note => note.id === noteId);
      
      if (!noteToUpdate) return state;
      
      let newTasks = [...(noteToUpdate.tasks || [])];
      
      if (hasSubtasks && Array.isArray(subtaskIndices) && subtaskIndices.length > 0) {
        // Create a map of indices to determine if a task should be moved
        const allIndicesToMove = [sourceIndex, ...subtaskIndices].sort();
        
        // Create a temporary array for tasks being moved
        const tasksToMove = allIndicesToMove.map(index => newTasks[index]);
        
        // Remove tasks from their original positions (starting from the highest index)
        for (let i = allIndicesToMove.length - 1; i >= 0; i--) {
          newTasks.splice(allIndicesToMove[i], 1);
        }
        
        // Insert all tasks at the target position
        newTasks.splice(
          targetIndex > sourceIndex ? targetIndex - allIndicesToMove.length : targetIndex, 
          0, 
          ...tasksToMove
        );
      } else {
        // Simple case - just move one task
        const [removed] = newTasks.splice(sourceIndex, 1);
        newTasks.splice(targetIndex, 0, removed);
      }
      
      newState = {
        ...state,
        notes: (state.notes || []).map(note => 
          note.id === noteId ? { ...note, tasks: newTasks } : note
        ),
        undoStack: addToUndoStack(state, action)
      };
      
      // We don't create a version snapshot for reorder operations to avoid cluttering history
      return newState;
    }
    
    case CHANGE_TEXT_SIZE: {
      const { id, size } = action.payload;
      
      newState = {
        ...state,
        notes: (state.notes || []).map(note => 
          note.id === id ? { ...note, textSize: size } : note
        ),
        undoStack: addToUndoStack(state, action)
      };
      
      // We don't create a version snapshot for text size changes to avoid cluttering history
      return newState;
    }
    
    case CHANGE_TASK_SPACING: {
      const { id, spacing } = action.payload;
      
      newState = {
        ...state,
        notes: (state.notes || []).map(note => 
          note.id === id ? { ...note, taskSpacing: spacing } : note
        ),
        undoStack: addToUndoStack(state, action)
      };
      
      // We don't create a version snapshot for spacing changes to avoid cluttering history
      return newState;
    }
    
    case DELETE_ARCHIVED_TASK: {
      newState = {
        ...state,
        archivedTasks: (state.archivedTasks || []).filter(task => task.id !== action.payload.taskId),
        undoStack: addToUndoStack(state, action)
      };
      
      // Create a version snapshot
      const archivedTask = (state.archivedTasks || []).find(task => task.id === action.payload.taskId);
      const snapshot = createVersionSnapshot(
        newState, 
        `Deleted archived task: ${archivedTask?.text.substring(0, 20)}${archivedTask?.text?.length ? (archivedTask.text.length > 20 ? '...' : '') : ''}`
      );
      newState.versionHistory = [...(state.versionHistory || []), snapshot];
      
      return newState;
    }
    
    case RESTORE_ARCHIVED_TASK: {
      const { taskId } = action.payload;
      
      // Find the archived task
      const archivedTask = (state.archivedTasks || []).find(task => task.id === taskId);
      if (!archivedTask) return state;
      
      // Check if the original note still exists
      const noteExists = (state.notes || []).some(note => note.id === archivedTask.noteId);
      
      // If note doesn't exist anymore, create a new note for the task
      if (!noteExists) {
        const newNote: Note = {
          id: generateId(),
          title: 'Restored Tasks',
          color: 'yellow',
          tasks: [{
            id: generateId(),
            text: archivedTask.text,
            completed: false,
            indentation: 0,
            priority: 'none'
          }],
          position: { x: 200, y: 200 },
          textSize: 14,
          taskSpacing: 8
        };
        
        newState = {
          ...state,
          notes: [...(state.notes || []), newNote],
          archivedTasks: (state.archivedTasks || []).filter(task => task.id !== taskId),
          undoStack: addToUndoStack(state, action)
        };
        
        // Create a version snapshot
        const snapshot = createVersionSnapshot(
          newState, 
          `Restored archived task to new note "${newNote.title}": ${archivedTask.text.substring(0, 20)}${archivedTask.text.length > 20 ? '...' : ''}`
        );
        newState.versionHistory = [...(state.versionHistory || []), snapshot];
        
        return newState;
      }
      
      // If note exists, restore task to its original note
      newState = {
        ...state,
        notes: (state.notes || []).map(note => 
          note.id === archivedTask.noteId
            ? {
                ...note,
                tasks: [...(note.tasks || []), {
                  id: generateId(),
                  text: archivedTask.text,
                  completed: false,
                  indentation: 0,
                  priority: 'none'
                }]
              }
            : note
        ),
        archivedTasks: (state.archivedTasks || []).filter(task => task.id !== taskId),
        undoStack: addToUndoStack(state, action)
      };
      
      // Create a version snapshot
      const snapshot = createVersionSnapshot(
        newState, 
        `Restored archived task to "${archivedTask.noteTitle}": ${archivedTask.text.substring(0, 20)}${archivedTask.text.length > 20 ? '...' : ''}`
      );
      newState.versionHistory = [...(state.versionHistory || []), snapshot];
      
      return newState;
    }
    
    case SET_SEARCH: {
      return {
        ...state,
        search: {
          term: action.payload.term,
          isActive: true,
          scope: action.payload.scope || 'global',
          noteId: action.payload.noteId || null
        }
      };
    }
    
    case CLEAR_SEARCH: {
      return {
        ...state,
        search: {
          term: '',
          isActive: false,
          scope: 'global',
          noteId: null
        }
      };
    }
    
    case SAVE_VERSION: {
      const { description } = action.payload;
      
      // Create a version snapshot
      const snapshot = createVersionSnapshot(state, description);
      
      return {
        ...state,
        versionHistory: [...(state.versionHistory || []), snapshot]
      };
    }
    
    case RESTORE_VERSION: {
      const { version } = action.payload;
      
      // Find the version to restore
      const versionToRestore = (state.versionHistory || []).find(v => v.timestamp === version);
      if (!versionToRestore) return state;
      
      // Create a new version snapshot before restoring
      const preRestoreSnapshot = createVersionSnapshot(
        state, 
        `State before restoring to: ${versionToRestore.description}`
      );
      
      // Restore the selected version's data, but keep the current version history
      return {
        ...versionToRestore.data,
        versionHistory: [...(state.versionHistory || []), preRestoreSnapshot],
        undoStack: state.undoStack || [],
        boardId: state.boardId
      };
    }
    
    case UNDO: {
      if (!state.undoStack || state.undoStack.length === 0) {
        return state;
      }
      
      // Get the most recent action to undo
      const lastAction = state.undoStack[0];
      
      // Create a version snapshot before undoing
      const preUndoSnapshot = createVersionSnapshot(
        state, 
        `State before undoing: ${lastAction.type}`
      );
      
      // Find the version to restore - get closest version before this action
      const versionToRestore = (state.versionHistory || [])
        .filter(v => v.timestamp < lastAction.timestamp)
        .sort((a, b) => b.timestamp - a.timestamp)[0];
      
      if (!versionToRestore) {
        // If no version is found, just remove the action from undo stack
        return {
          ...state,
          undoStack: state.undoStack.slice(1),
          versionHistory: [...(state.versionHistory || []), preUndoSnapshot]
        };
      }
      
      // Restore the version before this action
      return {
        ...versionToRestore.data,
        versionHistory: [...(state.versionHistory || []), preUndoSnapshot],
        undoStack: state.undoStack.slice(1),
        boardId: state.boardId,
        userId: state.userId
      };
    }
    
    case SYNC_BOARD: {
      return {
        ...state,
        isSynced: true,
        lastSyncTime: Date.now()
      };
    }
    
    default:
      return state;
  }
};

// Maximum number of version snapshots to keep
const MAX_VERSION_HISTORY = 50;

// Save state to localStorage with collision detection
const saveState = (state: BoardState) => {
  try {
    // First get the current state from localStorage
    const savedState = localStorage.getItem('stickitState');
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      
      // Check if there's a conflict by comparing last sync times
      if (parsedState.lastSyncTime > state.lastSyncTime) {
        // Create a conflict version that merges changes
        const mergedState = {
          ...state,
          notes: mergeNotes(parsedState.notes, state.notes),
          archivedTasks: [...new Set([...(parsedState.archivedTasks || []), ...(state.archivedTasks || [])])],
          lastSyncTime: Date.now()
        };
        
        // Trim version history if it's too long
        if (mergedState.versionHistory && mergedState.versionHistory.length > MAX_VERSION_HISTORY) {
          mergedState.versionHistory = mergedState.versionHistory.slice(-MAX_VERSION_HISTORY);
        }
        
        localStorage.setItem('stickitState', JSON.stringify(mergedState));
        return;
      }
    }
    
    // No conflict, just save the state
    // Trim version history if it's too long
    let stateToSave = { ...state };
    if (stateToSave.versionHistory && stateToSave.versionHistory.length > MAX_VERSION_HISTORY) {
      stateToSave = {
        ...stateToSave,
        versionHistory: stateToSave.versionHistory.slice(-MAX_VERSION_HISTORY)
      };
    }
    
    localStorage.setItem('stickitState', JSON.stringify(stateToSave));
  } catch (e) {
    console.error('Error saving state to localStorage', e);
  }
};

// Helper function to merge notes during conflict resolution
const mergeNotes = (oldNotes: Note[] = [], newNotes: Note[] = []): Note[] => {
  if (!oldNotes) return newNotes || [];
  if (!newNotes) return oldNotes || [];
  
  const mergedNotes: Note[] = [...oldNotes];
  
  // Create a map of note IDs for faster lookup
  const noteMap = new Map(mergedNotes.map(note => [note.id, note]));
  
  // Process each note in the new state
  newNotes.forEach(newNote => {
    const existingNote = noteMap.get(newNote.id);
    
    if (!existingNote) {
      // New note doesn't exist in old state, add it
      mergedNotes.push(newNote);
    } else {
      // Note exists in both states, merge tasks
      const mergedTasks = mergeTasks(existingNote.tasks || [], newNote.tasks || []);
      
      // Update the existing note
      const noteIndex = mergedNotes.findIndex(note => note.id === newNote.id);
      if (noteIndex !== -1) {
        mergedNotes[noteIndex] = {
          ...newNote,
          tasks: mergedTasks
        };
      }
    }
  });
  
  return mergedNotes;
};

// Helper function to merge tasks during conflict resolution
const mergeTasks = (oldTasks: Task[] = [], newTasks: Task[] = []): Task[] => {
  if (!oldTasks) return newTasks || [];
  if (!newTasks) return oldTasks || [];
  
  const mergedTasks: Task[] = [...oldTasks];
  
  // Create a map of task IDs for faster lookup
  const taskMap = new Map(mergedTasks.map(task => [task.id, task]));
  
  // Process each task in the new state
  newTasks.forEach(newTask => {
    if (!taskMap.has(newTask.id)) {
      // Task doesn't exist in old state, add it
      mergedTasks.push(newTask);
    } else {
      // Task exists in both states, use the newer version
      const taskIndex = mergedTasks.findIndex(task => task.id === newTask.id);
      if (taskIndex !== -1) {
        mergedTasks[taskIndex] = newTask;
      }
    }
  });
  
  return mergedTasks;
};

// Load state from localStorage
const loadState = (): BoardState => {
  try {
    const savedState = localStorage.getItem('stickitState');
    if (savedState === null) {
      return initialState;
    }
    const parsedState = JSON.parse(savedState);
    
    // Ensure the state has all the required properties
    return {
      ...initialState,
      ...parsedState,
      // Make sure new properties are initialized if loading from older version
      archivedTasks: parsedState.archivedTasks || [],
      search: parsedState.search || initialState.search,
      versionHistory: parsedState.versionHistory || [],
      undoStack: parsedState.undoStack || [],
      boardId: parsedState.boardId || uuidv4(),
      isSynced: parsedState.isSynced || false,
      lastSyncTime: parsedState.lastSyncTime || 0
    };
  } catch (e) {
    console.error('Error loading state from localStorage', e);
    return initialState;
  }
};

// Provider component
export const BoardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(boardReducer, loadState());
  const { state: authState } = useAuth();
  
  // Sync with Firebase when user is authenticated and changes occur
  useEffect(() => {
    const syncWithFirebase = async () => {
      if (authState.isAuthenticated && authState.user && state.boardId) {
        try {
          // Save state to Firebase
          await saveBoardState(authState.user.id, state);
          
          // Update sync status
          dispatch({
            type: SYNC_BOARD
          });
        } catch (error) {
          console.error('Error syncing with Firebase:', error);
        }
      }
    };
    
    // Debounce syncing to avoid too many writes
    const syncTimeout = setTimeout(() => {
      syncWithFirebase();
    }, 2000);
    
    return () => clearTimeout(syncTimeout);
  }, [state.notes, state.archivedTasks, authState.isAuthenticated, authState.user]);
  
  // Load board from Firebase when user logs in
  useEffect(() => {
    const loadBoardFromFirebase = async () => {
      if (authState.isAuthenticated && authState.user && state.boardId) {
        try {
          // Try to get existing board data
          const boardData = await getBoardState(state.boardId);
          
          if (boardData) {
            // Load the board data from Firebase
            dispatch({
              type: LOAD_BOARD,
              payload: boardData
            });
          }
          // If boardData is null, we'll just use the initial state which is fine
          // No need to throw or handle an error
        } catch (error) {
          console.error('Error loading board from Firebase:', error);
          // If board doesn't exist yet, we'll create it on next sync
        }
      }
    };
    
    if (authState.isAuthenticated && !state.isSynced) {
      loadBoardFromFirebase();
    }
  }, [authState.isAuthenticated, authState.user]);
  
  // Save state to localStorage whenever it changes
  useEffect(() => {
    saveState(state);
  }, [state]);
  
  // Create automatic backup when significant changes occur
  useEffect(() => {
    const createAutomaticBackup = async () => {
      if (authState.isAuthenticated && authState.user && state.boardId && 
          (state.notes || []).length > 0 && !state.boardId.includes('test')) {
        try {
          await createBackup(
            authState.user.id, 
            state.boardId, 
            state
          );
        } catch (error) {
          console.error('Error creating automatic backup:', error);
        }
      }
    };
    
    // We don't want to create backups for every small change
    // Instead, track significant events like adding/deleting notes
    const significantChanges = [
      ADD_NOTE, DELETE_NOTE, RESTORE_VERSION
    ];
    
    // Check if the last action was significant
    if (state.undoStack && state.undoStack.length > 0 && 
        significantChanges.includes(state.undoStack[0].type)) {
      createAutomaticBackup();
    }
  }, [state.undoStack, authState.isAuthenticated, authState.user]);
  
  return (
    <BoardContext.Provider value={{ state, dispatch }}>
      {children}
    </BoardContext.Provider>
  );
};

// Custom hook to use the board context
export const useBoard = () => {
  const context = useContext(BoardContext);
  if (!context) {
    throw new Error('useBoard must be used within a BoardProvider');
  }
  return context;
};