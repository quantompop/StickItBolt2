import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, act, screen, fireEvent } from '@testing-library/react';
import { BoardProvider, useBoard, boardReducer } from '../BoardContext';
import * as storageService from '../../firebase/storageService';
import { Note, Task, BoardState } from '../../types';

// Mock localStorage
vi.mock('../../firebase/storageService', () => ({
  saveBoardState: vi.fn(),
  getBoardState: vi.fn()
}));

// Mock useAuth hook
vi.mock('../AuthContext', () => ({
  useAuth: () => ({
    state: {
      isAuthenticated: true,
      user: { id: 'test-user' }
    }
  })
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('BoardContext', () => {
  // Test component to access the context
  const TestComponent = () => {
    const { state, dispatch } = useBoard();
    
    return (
      <div>
        <div data-testid="notes-count">{state.notes?.length || 0}</div>
        <button 
          data-testid="add-note-btn"
          onClick={() => dispatch({ 
            type: 'ADD_NOTE', 
            payload: { color: 'yellow', position: { x: 100, y: 100 } }
          })}
        >
          Add Note
        </button>
      </div>
    );
  };

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    // Setup fake timers for this test suite
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    // Restore real timers
    vi.useRealTimers();
  });

  describe('BoardProvider', () => {
    it('should provide board state and dispatch', () => {
      render(
        <BoardProvider>
          <TestComponent />
        </BoardProvider>
      );

      expect(screen.getByTestId('notes-count')).toHaveTextContent('0');
      
      // Add a note
      act(() => {
        fireEvent.click(screen.getByTestId('add-note-btn'));
      });
      
      expect(screen.getByTestId('notes-count')).toHaveTextContent('1');
    });

    it('should save state to localStorage on changes', () => {
      const setItemSpy = vi.spyOn(localStorageMock, 'setItem');
      
      render(
        <BoardProvider>
          <TestComponent />
        </BoardProvider>
      );

      // Add a note
      act(() => {
        fireEvent.click(screen.getByTestId('add-note-btn'));
      });
      
      expect(setItemSpy).toHaveBeenCalled();
      expect(setItemSpy).toHaveBeenCalledWith('stickitState', expect.any(String));
    });

    it('should sync with Firebase when authenticated', async () => {
      render(
        <BoardProvider>
          <TestComponent />
        </BoardProvider>
      );

      // Add a note
      act(() => {
        fireEvent.click(screen.getByTestId('add-note-btn'));
      });
      
      // Wait for debounced sync (2000ms in the code)
      act(() => {
        vi.advanceTimersByTime(2500);
      });
      
      expect(storageService.saveBoardState).toHaveBeenCalled();
    });
  });

  describe('boardReducer', () => {
    const initialState: BoardState = {
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
      undoStack: []
    };

    it('should add a note', () => {
      const action = {
        type: 'ADD_NOTE',
        payload: { color: 'yellow', position: { x: 100, y: 100 } }
      };

      const newState = boardReducer(initialState, action);
      
      expect(newState.notes?.length).toBe(1);
      expect(newState.notes?.[0]).toMatchObject({
        color: 'yellow',
        position: { x: 100, y: 100 },
        tasks: []
      });
      expect(newState.versionHistory?.length).toBe(1);
    });

    it('should delete a note', () => {
      // First add a note
      const state = boardReducer(initialState, {
        type: 'ADD_NOTE',
        payload: { color: 'yellow', position: { x: 100, y: 100 } }
      });
      
      const noteId = state.notes?.[0]?.id;
      
      // Then delete it
      const action = {
        type: 'DELETE_NOTE',
        payload: { id: noteId }
      };

      const newState = boardReducer(state, action);
      
      expect(newState.notes?.length).toBe(0);
      expect(newState.versionHistory?.length).toBe(2); // Initial + deletion
    });

    it('should add a task to a note', () => {
      // First add a note
      const state = boardReducer(initialState, {
        type: 'ADD_NOTE',
        payload: { color: 'yellow', position: { x: 100, y: 100 } }
      });
      
      const noteId = state.notes?.[0]?.id;
      
      // Then add a task
      const action = {
        type: 'ADD_TASK',
        payload: { noteId, text: 'Test task' }
      };

      const newState = boardReducer(state, action);
      
      expect(newState.notes?.[0]?.tasks?.length).toBe(1);
      expect(newState.notes?.[0]?.tasks?.[0]?.text).toBe('Test task');
      expect(newState.versionHistory?.length).toBe(2); // Initial + task addition
    });

    it('should toggle a task to completed and archive it', () => {
      // Setup a note with a task
      let state = boardReducer(initialState, {
        type: 'ADD_NOTE',
        payload: { color: 'yellow', position: { x: 100, y: 100 } }
      });
      
      const noteId = state.notes?.[0]?.id;
      
      state = boardReducer(state, {
        type: 'ADD_TASK',
        payload: { noteId, text: 'Test task' }
      });
      
      const taskId = state.notes?.[0]?.tasks?.[0]?.id;
      
      // Toggle the task
      const action = {
        type: 'TOGGLE_TASK',
        payload: { noteId, taskId }
      };

      const newState = boardReducer(state, action);
      
      // Task should be removed from note and added to archived tasks
      expect(newState.notes?.[0]?.tasks?.length).toBe(0);
      expect(newState.archivedTasks?.length).toBe(1);
      expect(newState.archivedTasks?.[0]?.text).toBe('Test task');
      expect(newState.versionHistory?.length).toBe(3); // Initial + task + archive
    });

    it('should restore an archived task', () => {
      // Setup a note with a completed task
      let state = boardReducer(initialState, {
        type: 'ADD_NOTE',
        payload: { color: 'yellow', position: { x: 100, y: 100 } }
      });
      
      const noteId = state.notes?.[0]?.id;
      
      state = boardReducer(state, {
        type: 'ADD_TASK',
        payload: { noteId, text: 'Test task' }
      });
      
      const taskId = state.notes?.[0]?.tasks?.[0]?.id;
      
      state = boardReducer(state, {
        type: 'TOGGLE_TASK',
        payload: { noteId, taskId }
      });
      
      const archivedTaskId = state.archivedTasks?.[0]?.id;
      
      // Restore the archived task
      const action = {
        type: 'RESTORE_ARCHIVED_TASK',
        payload: { taskId: archivedTaskId }
      };

      const newState = boardReducer(state, action);
      
      // Task should be added back to the note and removed from archived
      expect(newState.notes?.[0]?.tasks?.length).toBe(1);
      expect(newState.archivedTasks?.length).toBe(0);
      expect(newState.versionHistory?.length).toBe(4); // Initial + task + archive + restore
    });

    it('should save a version snapshot', () => {
      const action = {
        type: 'SAVE_VERSION',
        payload: { description: 'Test snapshot' }
      };

      const newState = boardReducer(initialState, action);
      
      expect(newState.versionHistory?.length).toBe(1);
      expect(newState.versionHistory?.[0]?.description).toBe('Test snapshot');
      expect(newState.versionHistory?.[0]?.timestamp).toBeDefined();
    });

    it('should restore a version', () => {
      // Create a version with a note
      let state = boardReducer(initialState, {
        type: 'ADD_NOTE',
        payload: { color: 'yellow', position: { x: 100, y: 100 } }
      });
      
      // Save that version
      const originalTimestamp = state.versionHistory?.[0]?.timestamp;
      
      // Add another note
      state = boardReducer(state, {
        type: 'ADD_NOTE',
        payload: { color: 'blue', position: { x: 200, y: 200 } }
      });
      
      // Now we should have 2 notes and 2 versions
      expect(state.notes?.length).toBe(2);
      expect(state.versionHistory?.length).toBe(2);
      
      // Restore to the original version
      const action = {
        type: 'RESTORE_VERSION',
        payload: { version: originalTimestamp }
      };

      const newState = boardReducer(state, action);
      
      // Should have 1 note now (from original version)
      expect(newState.notes?.length).toBe(1);
      // Should have 3 versions (original + second + restore point)
      expect(newState.versionHistory?.length).toBe(3);
    });
  });
});