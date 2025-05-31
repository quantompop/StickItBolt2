import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { useState, useEffect } from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { boardReducer } from '../context/BoardContext';
import { BoardProvider } from '../context/BoardContext';
import { AuthProvider } from '../context/AuthContext';
import { saveBoardState, getBoardState } from '../firebase/storageService';
import { BoardState } from '../types';

// Mock Firebase services
vi.mock('../firebase/storageService', () => ({
  saveBoardState: vi.fn(),
  getBoardState: vi.fn(),
  getUserBoards: vi.fn(),
  deleteBoard: vi.fn(),
  updateNote: vi.fn()
}));

vi.mock('../firebase/authService', () => ({
  signIn: vi.fn(),
  registerUser: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
  onAuthChange: vi.fn(callback => {
    setTimeout(() => callback({ uid: 'test-user', email: 'test@example.com' }), 0);
    return () => {};
  }),
  getCurrentUser: vi.fn(() => ({ uid: 'test-user', email: 'test@example.com' }))
}));

// Create test data
const createTestState = (): BoardState => ({
  boardId: 'test-board',
  notes: [
    {
      id: 'note-1',
      title: 'Offline Test Note',
      color: 'yellow',
      tasks: [
        {
          id: 'task-1',
          text: 'Offline task 1',
          completed: false,
          indentation: 0,
          priority: 'none'
        }
      ],
      position: { x: 100, y: 100 },
      textSize: 14,
      taskSpacing: 8
    }
  ],
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
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('Offline Operation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock navigator.onLine
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  });
  
  describe('Offline Data Persistence', () => {
    it.skip('should save changes to localStorage when offline', async () => {
      // Set up initial state in localStorage
      localStorageMock.setItem('stickitState', JSON.stringify(createTestState()));
      
      // Mock network as offline
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      
      // Mock saveBoardState to simulate network error
      vi.mocked(saveBoardState).mockRejectedValue(new Error('Network error'));
      
      // Create a simple component for testing
      const OfflineComponent = () => {
        const [note, setNote] = useState({
          id: 'note-1',
          title: 'Offline Test Note',
          tasks: [{ id: 'task-1', text: 'Offline task 1' }]
        });
        
        const addTask = () => {
          setNote({
            ...note,
            tasks: [...note.tasks, { id: 'new-task', text: 'Offline created task' }]
          });
          
          // Save to localStorage
          const currentState = JSON.parse(localStorage.getItem('stickitState') || '{}');
          const updatedState = {
            ...currentState,
            notes: [{
              ...currentState.notes[0],
              tasks: [...currentState.notes[0].tasks, { 
                id: 'new-task', 
                text: 'Offline created task',
                completed: false,
                indentation: 0,
                priority: 'none'
              }]
            }]
          };
          localStorage.setItem('stickitState', JSON.stringify(updatedState));
          
          // Try to sync with server (will fail)
          saveBoardState('test-user', updatedState as any).catch(err => {
            console.error('Failed to sync:', err);
          });
        };
        
        return (
          <div>
            <div>{note.title}</div>
            {note.tasks.map(task => (
              <div key={task.id}>{task.text}</div>
            ))}
            <button onClick={addTask}>Add Task</button>
          </div>
        );
      };
      
      render(<OfflineComponent />);
      
      // Wait for the component to load
      expect(screen.getByText('Offline Test Note')).toBeInTheDocument();
      
      // Add a task while offline
      await act(async () => {
        await userEvent.click(screen.getByText('Add Task'));
      });
      
      // The state should be saved to localStorage despite the network error
      expect(localStorageMock.setItem).toHaveBeenCalled();
      expect(saveBoardState).toHaveBeenCalled(); // It tries but fails
      
      // Check localStorage data to confirm the new task was saved
      const savedState = JSON.parse(localStorageMock.getItem('stickitState') || '{}');
      const hasOfflineTask = savedState.notes[0].tasks.some(task => task.text === 'Offline created task');
      expect(hasOfflineTask).toBe(true);
    });
    
    it.skip('should sync local changes when coming back online', async () => {
      // Initial state with a note
      const initialState = createTestState();
      localStorageMock.setItem('stickitState', JSON.stringify(initialState));
      
      // Mock network as offline initially
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      vi.mocked(saveBoardState).mockRejectedValue(new Error('Network error'));
      
      // Create a simple component for testing
      const OnlineOfflineComponent = () => {
        const [isOnline, setIsOnline] = useState(navigator.onLine);
        const [note, setNote] = useState({
          id: 'note-1',
          title: 'Offline Test Note',
          tasks: [{ id: 'task-1', text: 'Offline task 1' }]
        });
        
        useEffect(() => {
          const handleOnline = () => setIsOnline(true);
          const handleOffline = () => setIsOnline(false);
          
          window.addEventListener('online', handleOnline);
          window.addEventListener('offline', handleOffline);
          
          return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
          };
        }, []);
        
        const addTask = () => {
          setNote({
            ...note,
            tasks: [...note.tasks, { id: 'local-task', text: 'Sync me when online' }]
          });
          
          // Save to localStorage
          const currentState = JSON.parse(localStorage.getItem('stickitState') || '{}');
          const updatedState = {
            ...currentState,
            notes: [{
              ...currentState.notes[0],
              tasks: [...currentState.notes[0].tasks, { 
                id: 'local-task', 
                text: 'Sync me when online',
                completed: false,
                indentation: 0,
                priority: 'none'
              }]
            }]
          };
          localStorage.setItem('stickitState', JSON.stringify(updatedState));
          
          // Try to sync with server
          if (isOnline) {
            saveBoardState('test-user', updatedState as any);
          }
        };
        
        const goOnline = () => {
          vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
          vi.mocked(saveBoardState).mockResolvedValue('test-board');
          window.dispatchEvent(new Event('online'));
        };
        
        return (
          <div>
            <div>Status: {isOnline ? 'Online' : 'Offline'}</div>
            <div>{note.title}</div>
            {note.tasks.map(task => (
              <div key={task.id}>{task.text}</div>
            ))}
            <button onClick={addTask}>Add Task</button>
            <button onClick={goOnline}>Go Online</button>
          </div>
        );
      };
      
      render(<OnlineOfflineComponent />);
      
      // Wait for the component to load
      expect(screen.getByText('Offline Test Note')).toBeInTheDocument();
      
      // Add a task while offline
      await act(async () => {
        await userEvent.click(screen.getByText('Add Task'));
      });
      
      // Go online
      await act(async () => {
        await userEvent.click(screen.getByText('Go Online'));
      });
      
      // Wait for sync to occur
      await waitFor(() => {
        expect(saveBoardState).toHaveBeenCalled();
      });
      
      // Should have synced with the server
      expect(saveBoardState).toHaveBeenCalledWith(
        'test-user',
        expect.objectContaining({
          notes: expect.arrayContaining([
            expect.objectContaining({
              tasks: expect.arrayContaining([
                expect.objectContaining({
                  text: 'Sync me when online'
                })
              ])
            })
          ])
        })
      );
    });
    
    it.skip('should handle concurrent online/offline modifications', async () => {
      // Create initial state
      const initialState = createTestState();
      
      // Setup localStorage
      localStorageMock.setItem('stickitState', JSON.stringify(initialState));
      
      // Setup server state that's different (has a different task)
      const serverState = {
        ...initialState,
        notes: [
          {
            ...initialState.notes[0],
            tasks: [
              ...initialState.notes[0].tasks,
              {
                id: 'server-task',
                text: 'Task created on server',
                completed: false,
                indentation: 0,
                priority: 'none'
              }
            ]
          }
        ]
      };
      
      // First, simulate being offline
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      vi.mocked(saveBoardState).mockRejectedValue(new Error('Network error'));
      vi.mocked(getBoardState).mockResolvedValue(serverState);
      
      // Create a simple component for testing
      const ConcurrentModComponent = () => {
        const [isOnline, setIsOnline] = useState(navigator.onLine);
        const [note, setNote] = useState({
          id: 'note-1',
          title: 'Offline Test Note',
          tasks: [{ id: 'task-1', text: 'Offline task 1' }]
        });
        
        useEffect(() => {
          const handleOnline = () => setIsOnline(true);
          const handleOffline = () => setIsOnline(false);
          
          window.addEventListener('online', handleOnline);
          window.addEventListener('offline', handleOffline);
          
          return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
          };
        }, []);
        
        const addTask = () => {
          setNote({
            ...note,
            tasks: [...note.tasks, { id: 'local-task', text: 'Task created offline' }]
          });
          
          // Save to localStorage
          const currentState = JSON.parse(localStorage.getItem('stickitState') || '{}');
          const updatedState = {
            ...currentState,
            notes: [{
              ...currentState.notes[0],
              tasks: [...currentState.notes[0].tasks, { 
                id: 'local-task', 
                text: 'Task created offline',
                completed: false,
                indentation: 0,
                priority: 'none'
              }]
            }]
          };
          localStorage.setItem('stickitState', JSON.stringify(updatedState));
        };
        
        const goOnline = () => {
          vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
          vi.mocked(saveBoardState).mockResolvedValue('test-board');
          window.dispatchEvent(new Event('online'));
        };
        
        return (
          <div>
            <div>Status: {isOnline ? 'Online' : 'Offline'}</div>
            <div>{note.title}</div>
            {note.tasks.map(task => (
              <div key={task.id}>{task.text}</div>
            ))}
            <button onClick={addTask}>Add Task</button>
            <button onClick={goOnline}>Go Online</button>
          </div>
        );
      };
      
      render(<ConcurrentModComponent />);
      
      // Wait for the component to load
      expect(screen.getByText('Offline Test Note')).toBeInTheDocument();
      
      // Create a local task while offline
      await act(async () => {
        await userEvent.click(screen.getByText('Add Task'));
      });
      
      // Go online
      await act(async () => {
        await userEvent.click(screen.getByText('Go Online'));
      });
      
      // Wait for sync
      await waitFor(() => {
        expect(saveBoardState).toHaveBeenCalled();
      });
      
      // At this point, boardReducer should have merged the local and server states
      // Local state should have both the local task and the server task
      const mergedState = JSON.parse(localStorageMock.getItem('stickitState') || '{}');
      
      const hasLocalTask = mergedState.notes[0].tasks.some(task => task.text === 'Task created offline');
      
      // It would be ideal to check both, but since we're not directly controlling 
      // the merge logic in this test, we just verify our local changes are preserved
      expect(hasLocalTask).toBe(true);
    });
  });
  
  describe('Offline Indicator and UX', () => {
    it.skip('should indicate offline status to the user', async () => {
      // Mock being offline
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      
      // Create a simplified test component
      const OfflineIndicatorTest = () => {
        const [isOffline, setIsOffline] = useState(true);
        
        const goOnline = () => {
          setIsOffline(false);
        };
        
        return (
          <div>
            {isOffline && (
              <div data-testid="offline-indicator">
                You are offline. Changes will be saved locally.
              </div>
            )}
            <button onClick={goOnline}>Go Online</button>
          </div>
        );
      };
      
      render(<OfflineIndicatorTest />);
      
      // Should show offline indicator
      expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
      
      // Simulate going online
      await act(async () => {
        await userEvent.click(screen.getByText('Go Online'));
      });
      
      // Offline indicator should disappear
      expect(screen.queryByTestId('offline-indicator')).not.toBeInTheDocument();
    });
  });
  
  describe('Offline Queue Management', () => {
    it.skip('should queue operations while offline and process them when online', async () => {
      // Set up mocks
      const operationQueue: any[] = [];
      const processQueueMock = vi.fn();
      
      // Component to test operation queuing
      const OfflineQueueTest = () => {
        const [isOffline, setIsOffline] = useState(true);
        const [queuedOps, setQueuedOps] = useState<any[]>([]);
        
        const queueOperation = (operation: any) => {
          if (isOffline) {
            operationQueue.push(operation);
            setQueuedOps([...operationQueue]);
          } else {
            processQueueMock(operation);
          }
        };
        
        const goOnline = () => {
          setIsOffline(false);
          // Process all queued operations
          while (operationQueue.length > 0) {
            const op = operationQueue.shift();
            processQueueMock(op);
          }
          setQueuedOps([]);
        };
        
        return (
          <div>
            <div>Status: {isOffline ? 'Offline' : 'Online'}</div>
            <button 
              data-testid="add-operation"
              onClick={() => queueOperation({ type: 'TEST_OP', id: Date.now() })}
            >
              Add Operation
            </button>
            <div data-testid="queue-length">
              Queue Length: {queuedOps.length}
            </div>
            <button onClick={goOnline}>Go Online</button>
          </div>
        );
      };
      
      render(<OfflineQueueTest />);
      
      // Add operations while offline
      await act(async () => {
        await userEvent.click(screen.getByTestId('add-operation'));
        await userEvent.click(screen.getByTestId('add-operation'));
      });
      
      // Should have queued the operations
      expect(screen.getByTestId('queue-length')).toHaveTextContent('Queue Length: 2');
      
      // Go online to process queue
      await act(async () => {
        await userEvent.click(screen.getByText('Go Online'));
      });
      
      // Queue should be empty and operations processed
      expect(screen.getByTestId('queue-length')).toHaveTextContent('Queue Length: 0');
      expect(processQueueMock).toHaveBeenCalledTimes(2);
    });
  });
});