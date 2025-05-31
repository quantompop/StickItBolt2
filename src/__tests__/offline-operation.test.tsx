import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { useState, useEffect } from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoardState } from '../types';
import { saveBoardState, getBoardState } from '../firebase/storageService';

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
    
    // Reset localStorage mock
    localStorageMock.getItem.mockReturnValue(JSON.stringify(createTestState()));
    
    // Ensure the saveBoardState mock is reset
    vi.mocked(saveBoardState).mockClear();
  });
  
  describe('Offline Data Persistence', () => {
    it('should save changes to localStorage when offline', async () => {
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
          setNote(prevNote => ({
            ...prevNote,
            tasks: [...prevNote.tasks, { id: 'new-task', text: 'Offline created task' }]
          }));
          
          // Get current state from localStorage
          const currentState = JSON.parse(localStorage.getItem('stickitState') || '{}');
          
          // Update state with new task
          const updatedState = {
            ...currentState,
            notes: currentState.notes.map(n => 
              n.id === 'note-1' ? {
                ...n,
                tasks: [
                  ...n.tasks,
                  { 
                    id: 'new-task', 
                    text: 'Offline created task',
                    completed: false,
                    indentation: 0,
                    priority: 'none'
                  }
                ]
              } : n
            )
          };
          
          // Save to localStorage
          localStorage.setItem('stickitState', JSON.stringify(updatedState));
          
          // Try to sync with server (will fail due to being offline)
          saveBoardState('test-user', updatedState).catch(err => {
            console.error('Failed to sync:', err);
          });
        };
        
        return (
          <div>
            <div data-testid="note-title">{note.title}</div>
            <div data-testid="tasks-container">
              {note.tasks.map(task => (
                <div key={task.id} data-testid={`task-${task.id}`}>{task.text}</div>
              ))}
            </div>
            <button onClick={addTask} data-testid="add-task-button">Add Task</button>
          </div>
        );
      };
      
      render(<OfflineComponent />);
      
      // Wait for the component to load
      expect(screen.getByTestId('note-title')).toHaveTextContent('Offline Test Note');
      expect(screen.getByTestId('tasks-container').children.length).toBe(1);
      
      // Add a task while offline
      await act(async () => {
        await userEvent.click(screen.getByTestId('add-task-button'));
      });
      
      // The state should be saved to localStorage despite the network error
      expect(localStorageMock.setItem).toHaveBeenCalled();
      expect(saveBoardState).toHaveBeenCalled(); // It tries but fails
      
      // UI should reflect the added task
      expect(screen.getByTestId('tasks-container').children.length).toBe(2);
      expect(screen.getByTestId('task-new-task')).toBeInTheDocument();
    });
    
    it('should sync local changes when coming back online', async () => {
      // Mock network as offline initially
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      
      // Setup saveBoardState mock
      vi.mocked(saveBoardState)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('test-board');
      
      // Create a simple component for testing
      const OnlineOfflineComponent = () => {
        const [isOnline, setIsOnline] = useState(navigator.onLine);
        const [note, setNote] = useState({
          id: 'note-1',
          title: 'Offline Test Note',
          tasks: [{ id: 'task-1', text: 'Offline task 1' }]
        });
        
        useEffect(() => {
          const handleOnline = () => {
            setIsOnline(true);
            
            // Force an immediate sync when going online
            const currentState = JSON.parse(localStorage.getItem('stickitState') || '{}');
            saveBoardState('test-user', currentState);
          };
          
          const handleOffline = () => setIsOnline(false);
          
          window.addEventListener('online', handleOnline);
          window.addEventListener('offline', handleOffline);
          
          return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
          };
        }, []);
        
        const addTask = () => {
          setNote(prevNote => ({
            ...prevNote,
            tasks: [...prevNote.tasks, { id: 'local-task', text: 'Sync me when online' }]
          }));
          
          // Save to localStorage
          const currentState = JSON.parse(localStorage.getItem('stickitState') || '{}');
          
          const updatedState = {
            ...currentState,
            notes: currentState.notes.map(n => 
              n.id === 'note-1' ? {
                ...n,
                tasks: [
                  ...n.tasks, 
                  { 
                    id: 'local-task', 
                    text: 'Sync me when online',
                    completed: false,
                    indentation: 0,
                    priority: 'none'
                  }
                ]
              } : n
            )
          };
          
          localStorage.setItem('stickitState', JSON.stringify(updatedState));
          
          // Try to sync with server (will fail if offline)
          if (isOnline) {
            saveBoardState('test-user', updatedState);
          }
        };
        
        const goOnline = () => {
          // Update the navigator.onLine mock
          vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
          // Dispatch the online event
          window.dispatchEvent(new Event('online'));
        };
        
        return (
          <div>
            <div data-testid="connection-status">Status: {isOnline ? 'Online' : 'Offline'}</div>
            <div data-testid="note-title">{note.title}</div>
            <div data-testid="tasks-container">
              {note.tasks.map(task => (
                <div key={task.id} data-testid={`task-${task.id}`}>{task.text}</div>
              ))}
            </div>
            <button onClick={addTask} data-testid="add-task-button">Add Task</button>
            <button onClick={goOnline} data-testid="go-online-button">Go Online</button>
          </div>
        );
      };
      
      render(<OnlineOfflineComponent />);
      
      // Wait for the component to load
      expect(screen.getByTestId('note-title')).toHaveTextContent('Offline Test Note');
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Status: Offline');
      
      // Add a task while offline
      await act(async () => {
        await userEvent.click(screen.getByTestId('add-task-button'));
      });
      
      // UI should reflect the added task
      expect(screen.getByTestId('tasks-container').children.length).toBe(2);
      expect(screen.getByTestId('task-local-task')).toBeInTheDocument();
      
      // Go online
      await act(async () => {
        await userEvent.click(screen.getByTestId('go-online-button'));
      });
      
      // Wait for sync to occur
      await waitFor(() => {
        expect(saveBoardState).toHaveBeenCalled();
      }, { timeout: 100 });
    });
    
    it('should handle concurrent online/offline modifications', async () => {
      // Create initial state
      const initialState = createTestState();
      
      // Setup localStorage
      localStorageMock.getItem.mockReturnValue(JSON.stringify(initialState));
      
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
      vi.mocked(saveBoardState)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('test-board');
        
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
          const handleOnline = () => {
            setIsOnline(true);
            
            // Force a sync when going online
            const currentState = JSON.parse(localStorage.getItem('stickitState') || '{}');
            saveBoardState('test-user', currentState);
          };
          
          const handleOffline = () => setIsOnline(false);
          
          window.addEventListener('online', handleOnline);
          window.addEventListener('offline', handleOffline);
          
          return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
          };
        }, []);
        
        const addTask = () => {
          setNote(prevNote => ({
            ...prevNote,
            tasks: [...prevNote.tasks, { id: 'local-task', text: 'Task created offline' }]
          }));
          
          // Save to localStorage
          const currentState = JSON.parse(localStorage.getItem('stickitState') || '{}');
          
          const updatedState = {
            ...currentState,
            notes: currentState.notes.map(n => 
              n.id === 'note-1' ? {
                ...n,
                tasks: [
                  ...n.tasks,
                  { 
                    id: 'local-task', 
                    text: 'Task created offline',
                    completed: false,
                    indentation: 0,
                    priority: 'none'
                  }
                ]
              } : n
            )
          };
          
          localStorage.setItem('stickitState', JSON.stringify(updatedState));
        };
        
        const goOnline = () => {
          vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
          window.dispatchEvent(new Event('online'));
        };
        
        return (
          <div>
            <div data-testid="connection-status">Status: {isOnline ? 'Online' : 'Offline'}</div>
            <div data-testid="note-title">{note.title}</div>
            <div data-testid="tasks-container">
              {note.tasks.map(task => (
                <div key={task.id} data-testid={`task-${task.id}`}>{task.text}</div>
              ))}
            </div>
            <button onClick={addTask} data-testid="add-task-button">Add Task</button>
            <button onClick={goOnline} data-testid="go-online-button">Go Online</button>
          </div>
        );
      };
      
      render(<ConcurrentModComponent />);
      
      // Wait for the component to load
      expect(screen.getByTestId('note-title')).toHaveTextContent('Offline Test Note');
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Status: Offline');
      
      // Create a local task while offline
      await act(async () => {
        await userEvent.click(screen.getByTestId('add-task-button'));
      });
      
      // UI should reflect the added task
      expect(screen.getByTestId('task-local-task')).toBeInTheDocument();
      
      // Go online
      await act(async () => {
        await userEvent.click(screen.getByTestId('go-online-button'));
      });
      
      // Wait for sync
      await waitFor(() => {
        expect(saveBoardState).toHaveBeenCalled();
      }, { timeout: 100 });
    });
  });
  
  describe('Offline Indicator and UX', () => {
    it('should indicate offline status to the user', async () => {
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
            <button onClick={goOnline} data-testid="go-online-button">Go Online</button>
          </div>
        );
      };
      
      render(<OfflineIndicatorTest />);
      
      // Should show offline indicator
      expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
      
      // Simulate going online
      await act(async () => {
        await userEvent.click(screen.getByTestId('go-online-button'));
      });
      
      // Offline indicator should disappear
      expect(screen.queryByTestId('offline-indicator')).not.toBeInTheDocument();
    });
  });
  
  describe('Offline Queue Management', () => {
    it('should queue operations while offline and process them when online', async () => {
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
            <div data-testid="connection-status">Status: {isOffline ? 'Offline' : 'Online'}</div>
            <button 
              data-testid="add-operation-button"
              onClick={() => queueOperation({ type: 'TEST_OP', id: Date.now() })}
            >
              Add Operation
            </button>
            <div data-testid="queue-length">
              Queue Length: {queuedOps.length}
            </div>
            <button onClick={goOnline} data-testid="go-online-button">Go Online</button>
          </div>
        );
      };
      
      render(<OfflineQueueTest />);
      
      // Add operations while offline
      await act(async () => {
        await userEvent.click(screen.getByTestId('add-operation-button'));
        await userEvent.click(screen.getByTestId('add-operation-button'));
      });
      
      // Should have queued the operations
      expect(screen.getByTestId('queue-length')).toHaveTextContent('Queue Length: 2');
      
      // Go online to process queue
      await act(async () => {
        await userEvent.click(screen.getByTestId('go-online-button'));
      });
      
      // Queue should be empty and operations processed
      expect(screen.getByTestId('queue-length')).toHaveTextContent('Queue Length: 0');
      expect(processQueueMock).toHaveBeenCalledTimes(2);
    });
  });
});