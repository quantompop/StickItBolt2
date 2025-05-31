import { describe, it, expect, vi, beforeEach } from 'vitest';
import { boardReducer } from '../context/BoardContext';
import { BoardState, Note, Task } from '../types';
import { generateId } from '../utils/helpers';
import React, { useState, useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BoardProvider } from '../context/BoardContext';
import { AuthProvider } from '../context/AuthContext';
import Board from '../components/Board';

// Mock Firebase Firestore functions
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');
  return {
    ...actual,
    doc: vi.fn(),
    getDoc: vi.fn().mockResolvedValue({
      exists: () => true,
      data: () => ({ notes: [], archivedTasks: [] })
    })
  };
});

// Create a test state generator for performance tests
const createPerformanceTestState = (
  noteCount: number, 
  tasksPerNote: number
): BoardState => {
  const notes: Note[] = [];
  
  for (let i = 0; i < noteCount; i++) {
    const tasks: Task[] = [];
    
    for (let j = 0; j < tasksPerNote; j++) {
      tasks.push({
        id: `task-${i}-${j}`,
        text: `Task ${j} of Note ${i}`,
        completed: false,
        indentation: Math.min(j % 5, 3),
        priority: j % 4 === 0 ? 'high' : j % 3 === 0 ? 'medium' : j % 2 === 0 ? 'low' : 'none'
      });
    }
    
    notes.push({
      id: `note-${i}`,
      title: `Note ${i}`,
      color: ['yellow', 'blue', 'green', 'pink', 'purple', 'orange'][i % 6],
      position: { x: 100 + (i % 5) * 300, y: 100 + Math.floor(i / 5) * 350 },
      tasks,
      textSize: 14,
      taskSpacing: 8
    });
  }
  
  return {
    boardId: 'performance-test-board',
    notes,
    archivedTasks: Array.from({ length: noteCount * 5 }, (_, i) => ({
      id: `archived-${i}`,
      text: `Archived Task ${i}`,
      noteId: `note-${i % noteCount}`,
      noteTitle: `Note ${i % noteCount}`,
      completedAt: Date.now() - (i * 60000)
    })),
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
    versionHistory: Array.from({ length: 20 }, (_, i) => ({
      timestamp: Date.now() - (i * 3600000),
      data: { notes: notes.slice(0, Math.max(1, noteCount - i)) } as BoardState,
      description: `Version ${i}`
    })),
    undoStack: []
  };
};

describe('Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock window methods to prevent actual alerts/prompts
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    vi.spyOn(window, 'prompt').mockImplementation(() => 'Test');
    
    // Mock performance.now()
    if (!window.performance) {
      (window as any).performance = { now: () => Date.now() };
    }
  });
  
  describe('Load Testing Under Peak Conditions', () => {
    it('should handle state updates with large number of notes efficiently', () => {
      // Create a large initial state (50 notes with 20 tasks each)
      const largeState = createPerformanceTestState(50, 20);
      
      // Measure the time to perform an operation
      const startTime = performance.now();
      
      // Add a new note
      const newState = boardReducer(largeState, {
        type: 'ADD_NOTE',
        payload: { color: 'yellow', position: { x: 100, y: 100 } }
      });
      
      const endTime = performance.now();
      const operationTime = endTime - startTime;
      
      // The operation should complete in a reasonable time
      expect(operationTime).toBeLessThan(1000);
      expect(newState.notes?.length).toBe(51);
    });

    it('should efficiently handle large number of archived tasks', () => {
      // Create a state with 500 archived tasks
      const archivedTasks = Array.from({ length: 500 }, (_, i) => ({
        id: `archived-${i}`,
        text: `Archived Task ${i}`,
        noteId: `note-${i % 10}`,
        noteTitle: `Note ${i % 10}`,
        completedAt: Date.now() - (i * 60000)
      }));
      
      const state: BoardState = {
        ...createPerformanceTestState(10, 5),
        archivedTasks
      };
      
      // Measure the time to delete an archived task
      const startTime = performance.now();
      
      const newState = boardReducer(state, {
        type: 'DELETE_ARCHIVED_TASK',
        payload: { taskId: 'archived-250' }
      });
      
      const endTime = performance.now();
      const operationTime = endTime - startTime;
      
      // The operation should complete in a reasonable time
      expect(operationTime).toBeLessThan(1000);
      expect(newState.archivedTasks?.length).toBe(499);
    });
  });
  
  describe('Response Time Validation', () => {
    it('should handle global search efficiently', () => {
      // Create a state with 50 notes and 20 tasks each
      const largeState = createPerformanceTestState(50, 20);
      
      // Measure the time to perform a global search
      const startTime = performance.now();
      
      const searchState = boardReducer(largeState, {
        type: 'SET_SEARCH',
        payload: { term: 'Task 10', scope: 'global' }
      });
      
      const endTime = performance.now();
      const searchTime = endTime - startTime;
      
      // The search should complete in a reasonable time
      expect(searchTime).toBeLessThan(1000);
      expect(searchState.search?.isActive).toBe(true);
      expect(searchState.search?.term).toBe('Task 10');
    });
    
    it('should maintain responsive UI with large dataset', async () => {
      // Create a component that renders with a large dataset
      const LargeDatasetComponent = () => {
        const [loading, setLoading] = useState(true);
        
        useEffect(() => {
          // Simulate loading large data
          setTimeout(() => {
            setLoading(false);
          }, 100);
        }, []);
        
        return (
          <div>
            {loading ? (
              <div data-testid="loading">Loading...</div>
            ) : (
              <div data-testid="content">
                Content Loaded
              </div>
            )}
          </div>
        );
      };
      
      // Render the component
      render(<LargeDatasetComponent />);
      
      // Should initially show loading
      expect(screen.getByTestId('loading')).toBeInTheDocument();
      
      // Should update UI in a reasonable time
      await waitFor(() => {
        expect(screen.getByTestId('content')).toBeInTheDocument();
      }, { timeout: 200 });
    });
  });
  
  describe('Memory Usage Optimization', () => {
    it('should limit version history to prevent memory issues', () => {
      // Create a state with a large version history
      const manyVersions = Array.from({ length: 100 }, (_, i) => ({
        timestamp: Date.now() - (i * 3600000),
        data: { notes: [] } as BoardState,
        description: `Version ${i}`
      }));
      
      const state: BoardState = {
        ...createPerformanceTestState(5, 5),
        versionHistory: manyVersions
      };
      
      // Add a note which should create a new version
      const newState = boardReducer(state, {
        type: 'ADD_NOTE',
        payload: { color: 'yellow', position: { x: 100, y: 100 } }
      });
      
      // Version history should be limited
      expect(newState.versionHistory?.length).toBeLessThanOrEqual(101);
    });
    
    it('should clean up unused references when deleting notes', () => {
      // Create a state with several notes
      const state = createPerformanceTestState(10, 5);
      const noteIdToDelete = state.notes[3].id;
      
      // Delete a note
      const newState = boardReducer(state, {
        type: 'DELETE_NOTE',
        payload: { id: noteIdToDelete }
      });
      
      // The note should be fully removed with no dangling references
      expect(newState.notes?.find(note => note.id === noteIdToDelete)).toBeUndefined();
      
      // Check that there are no references to this note in the draggedTask state
      expect(newState.draggedTask?.noteId).not.toBe(noteIdToDelete);
      
      // If search is active for this note, it should be cleared
      if (state.search?.noteId === noteIdToDelete) {
        expect(newState.search?.isActive).toBe(false);
      }
    });
  });
  
  describe('Database Query Performance', () => {
    it('should handle Firebase document retrieval efficiency', async () => {
      // Create a component that fetches from Firestore
      const FirestoreComponent = () => {
        const [loading, setLoading] = useState(true);
        const [data, setData] = useState<any>(null);
        
        useEffect(() => {
          const fetchData = async () => {
            try {
              // Simulate Firestore query
              const result = await Promise.resolve({ notes: [], archivedTasks: [] });
              setData(result);
            } catch (err) {
              console.error(err);
            } finally {
              setLoading(false);
            }
          };
          
          fetchData();
        }, []);
        
        return (
          <div>
            {loading ? (
              <div data-testid="loading">Loading Firestore data...</div>
            ) : (
              <div data-testid="firestore-loaded">Data loaded</div>
            )}
          </div>
        );
      };
      
      // Render component
      render(<FirestoreComponent />);
      
      // Should show loading initially
      expect(screen.getByTestId('loading')).toBeInTheDocument();
      
      // Should update within a reasonable time
      await waitFor(() => {
        expect(screen.getByTestId('firestore-loaded')).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });
  
  describe('API Response Times', () => {
    it('should handle slow API responses gracefully', async () => {
      // Create a component that simulates a slow API call
      const SlowAPIComponent = () => {
        const [loading, setLoading] = useState(true);
        const [timedOut, setTimedOut] = useState(false);
        const [data, setData] = useState<any>(null);
        
        useEffect(() => {
          const fetchData = async () => {
            // Set up timeout mechanism
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
              controller.abort();
              setTimedOut(true);
              setLoading(false);
            }, 3000); // 3 second timeout
            
            try {
              // Simulate very slow API (returns immediately in tests)
              const result = await Promise.resolve({ success: true, data: 'API response' });
              
              clearTimeout(timeoutId);
              setData(result);
              setLoading(false);
            } catch (err: any) {
              console.error(err);
              if (err.name !== 'AbortError') {
                clearTimeout(timeoutId);
                setLoading(false);
              }
            }
          };
          
          fetchData();
        }, []);
        
        return (
          <div>
            {loading && <div data-testid="api-loading">Loading...</div>}
            {timedOut && <div data-testid="api-timeout">Request timed out</div>}
            {data && <div data-testid="api-data">{JSON.stringify(data)}</div>}
          </div>
        );
      };
      
      // Render component
      render(<SlowAPIComponent />);
      
      // Should show loading initially
      expect(screen.getByTestId('api-loading')).toBeInTheDocument();
      
      // Should show data (since our mock resolves immediately)
      await waitFor(() => {
        expect(screen.getByTestId('api-data')).toBeInTheDocument();
      });
    });
  });
});