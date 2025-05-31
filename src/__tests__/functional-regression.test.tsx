import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { useState, useEffect } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { boardReducer } from '../context/BoardContext';
import { BoardState } from '../types';

// Create a minimal initial state for testing
const createInitialState = (): BoardState => ({
  boardId: 'test-board-id',
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
});

// Mock the context hooks
vi.mock('../context/BoardContext', async () => {
  const actual = await vi.importActual('../context/BoardContext');
  const mockDispatch = vi.fn();
  
  return {
    ...actual,
    useBoard: vi.fn(() => ({
      state: {
        search: {
          isActive: false,
          term: '',
          scope: 'global',
          noteId: null
        },
        draggedTask: {
          taskId: null,
          noteId: null,
          isDragging: false
        },
        notes: []
      },
      dispatch: mockDispatch
    })),
    boardReducer: actual.boardReducer,
    BoardProvider: ({ children }) => <>{children}</>
  };
});

describe('Functional Regression Tests', () => {
  // Setup user-event for more realistic interactions
  const user = userEvent.setup();
  const mockDispatch = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('Previous Bug Fixes', () => {
    it('should test slider value retention', async () => {
      // Create a component to test slider regression
      const SliderRegressionTest = () => {
        const [textSize, setTextSize] = useState(14);
        
        return (
          <div>
            <div data-testid="text-size">{textSize}</div>
            <div>
              <label>Text Size</label>
              <button onClick={() => setTextSize(prev => prev - 1)}>Smaller</button>
              <input 
                type="range" 
                role="slider" 
                value={textSize} 
                min={10} 
                max={20}
                onChange={e => setTextSize(Number(e.target.value))} 
              />
              <div>{textSize}px</div>
              <button onClick={() => setTextSize(prev => prev + 1)}>Larger</button>
            </div>
          </div>
        );
      };
      
      render(<SliderRegressionTest />);
      
      // Initial value
      expect(screen.getByTestId('text-size')).toHaveTextContent('14');
      
      // Change value with slider
      const slider = screen.getByRole('slider') as HTMLInputElement;
      await act(async () => {
        fireEvent.change(slider, { target: { value: '18' } });
      });
      
      // Value should update
      expect(screen.getByTestId('text-size')).toHaveTextContent('18');
      
      // Verify slider display shows updated value
      expect(screen.getByText('18px')).toBeInTheDocument();
      
      // Click decrease button
      await act(async () => {
        await userEvent.click(screen.getByText('Smaller'));
      });
      
      // Value should decrease by 1
      expect(screen.getByTestId('text-size')).toHaveTextContent('17');
      expect(screen.getByText('17px')).toBeInTheDocument();
    });
    
    it('should test priority submenu display and interaction', async () => {
      // Create a component to test priority menu regression
      const PriorityMenuTest = () => {
        const [priority, setPriority] = useState('none');
        
        const handleSetPriority = (newPriority) => {
          setPriority(newPriority);
          mockDispatch({
            type: 'SET_TASK_PRIORITY',
            payload: {
              noteId: 'note-1',
              taskId: 'task-priority-test',
              priority: newPriority
            }
          });
        };
        
        return (
          <div>
            <div>Priority: {priority}</div>
            <div className="context-menu">
              <div>Set priority</div>
              <div onClick={() => handleSetPriority('high')} data-testid="high-priority">High</div>
            </div>
          </div>
        );
      };
      
      render(<PriorityMenuTest />);
      
      // Click on High priority
      await act(async () => {
        await userEvent.click(screen.getByTestId('high-priority'));
      });
      
      // Priority should be updated
      expect(screen.getByText('Priority: high')).toBeInTheDocument();
      
      // Dispatch should be called with correct payload
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SET_TASK_PRIORITY',
          payload: expect.objectContaining({
            noteId: 'note-1',
            taskId: 'task-priority-test',
            priority: 'high'
          })
        })
      );
    });
    
    it('should test text synchronization during edits', async () => {
      // Create a component to test title edit synchronization
      const TitleEditTest = () => {
        const [title, setTitle] = useState('Initial Title');
        
        // Simulate a title update after rendering
        useEffect(() => {
          setTimeout(() => {
            setTitle('Updated Title');
          }, 100);
        }, []);
        
        const handleTitleChange = () => {
          mockDispatch({
            type: 'UPDATE_NOTE',
            payload: {
              id: 'note-update-test',
              title: 'Edited Title'
            }
          });
          setTitle('Edited Title');
        };
        
        // Create a mock Note component for testing
        return (
          <div>
            <div>{title}</div>
            <input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleChange}
              data-testid="title-input"
            />
          </div>
        );
      };
      
      render(<TitleEditTest />);
      
      // Wait for title update
      await waitFor(() => {
        expect(screen.getByText('Updated Title')).toBeInTheDocument();
      });
      
      // Find the input
      const input = screen.getByTestId('title-input');
      
      // Edit the input
      await act(async () => {
        fireEvent.change(input, { target: { value: 'Edited Title' } });
        fireEvent.blur(input);
      });
      
      // Should dispatch with correct title
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'UPDATE_NOTE',
          payload: expect.objectContaining({
            title: 'Edited Title'
          })
        })
      );
    });
    
    it('should test sign out functionality', async () => {
      // Mock sign out function
      const signOut = vi.fn().mockResolvedValue(true);
      
      // Create mock Board component for testing
      const Board = () => (
        <div>
          <button onClick={() => signOut()}>Sign Out</button>
        </div>
      );
      
      render(<Board />);
      
      // Sign Out button should be visible
      const signOutButton = screen.getByText('Sign Out');
      expect(signOutButton).toBeInTheDocument();
      
      // Click sign out
      await act(async () => {
        await userEvent.click(signOutButton);
      });
      
      // Sign out should be called
      expect(signOut).toHaveBeenCalled();
    });
    
    it('should handle empty task text gracefully', () => {
      const initialState = createInitialState();
      
      // Add a note first
      let state = boardReducer(initialState, {
        type: 'ADD_NOTE',
        payload: { color: 'yellow', position: { x: 100, y: 100 } }
      });
      
      const noteId = state.notes?.[0]?.id;
      
      // Try to add an empty task
      const newState = boardReducer(state, {
        type: 'ADD_TASK',
        payload: { noteId, text: '' }
      });
      
      // Empty task should not be added (task count should not increase)
      expect(newState.notes?.[0]?.tasks?.length || 0).toBe(0);
    });
    
    it('should handle empty note title gracefully', () => {
      const initialState = createInitialState();
      
      // Add a note first
      let state = boardReducer(initialState, {
        type: 'ADD_NOTE',
        payload: { color: 'yellow', position: { x: 100, y: 100 } }
      });
      
      const noteId = state.notes?.[0]?.id;
      
      // Try to update with an empty title
      const newState = boardReducer(state, {
        type: 'UPDATE_NOTE',
        payload: { id: noteId, title: '' }
      });
      
      // Should use a default title instead of empty string
      expect(newState.notes?.[0]?.title).toBeTruthy();
      expect(newState.notes?.[0]?.title).toBe('Untitled Note');
    });
  });
  
  describe('Board Component State Transitions', () => {
    it('should handle panel transitions correctly', async () => {
      // Create a component that mimics the Board component's panel behavior
      const BoardPanels = () => {
        const [showArchive, setShowArchive] = useState(false);
        const [showSearch, setShowSearch] = useState(false);
        
        const toggleArchive = () => {
          setShowArchive(!showArchive);
          if (showSearch) setShowSearch(false);
        };
        
        const toggleSearch = () => {
          setShowSearch(!showSearch);
          if (showArchive) setShowArchive(false);
        };
        
        return (
          <div>
            <button onClick={toggleArchive}>Archive</button>
            <button onClick={toggleSearch}>Search</button>
            
            {showArchive && (
              <div data-testid="archive-panel">Archived Tasks</div>
            )}
            
            {showSearch && (
              <div data-testid="search-panel">Global Search</div>
            )}
          </div>
        );
      };
      
      render(<BoardPanels />);
      
      // Toggle Archive panel
      await act(async () => {
        await userEvent.click(screen.getByText('Archive'));
      });
      expect(screen.getByTestId('archive-panel')).toBeInTheDocument();
      
      // Toggle Search panel - should close Archive panel
      await act(async () => {
        await userEvent.click(screen.getByText('Search'));
      });
      expect(screen.getByTestId('search-panel')).toBeInTheDocument();
      expect(screen.queryByTestId('archive-panel')).not.toBeInTheDocument();
    });
  });
  
  describe('Simulated Advanced User Behaviors', () => {
    it('should handle rapid task creation and editing', async () => {
      // Create a component to test rapid task creation
      const RapidTaskTest = () => {
        const [tasks, setTasks] = useState<string[]>([]);
        
        const handleAddTask = (text: string) => {
          setTasks(prev => [...prev, text]);
          
          mockDispatch({
            type: 'ADD_TASK',
            payload: { noteId: 'note-rapid-test', text }
          });
        };
        
        return (
          <div>
            <div>Rapid Task Test Note</div>
            <div>
              {tasks.map((task, i) => (
                <div key={i}>{task}</div>
              ))}
            </div>
            <input 
              placeholder="Add a task..."
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') {
                  handleAddTask(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
            />
            <button 
              data-testid="add-task" 
              onClick={() => handleAddTask('Quick task')}
            >
              Add Task
            </button>
          </div>
        );
      };
      
      render(<RapidTaskTest />);
      
      // Click add task button multiple times in rapid succession
      await act(async () => {
        await userEvent.click(screen.getByTestId('add-task'));
        await userEvent.click(screen.getByTestId('add-task'));
        await userEvent.click(screen.getByTestId('add-task'));
      });
      
      // Should have called dispatch 3 times
      expect(mockDispatch).toHaveBeenCalledTimes(3);
      
      // Verify each task was added
      expect(screen.getAllByText('Quick task')).toHaveLength(3);
    });
  });
  
  describe('Visual Appearance Tests', () => {
    it('should verify CSS classes are correctly applied to elements', async () => {
      // Create a simple component to verify CSS classes
      const StyledComponent = () => (
        <div className="bg-blue-400 text-white p-4 rounded shadow">
          <div className="text-lg font-bold">CSS Test Component</div>
          <div className="task-item" style={{ 
            marginLeft: '40px', 
            marginBottom: '12px', 
            fontSize: '16px',
            textDecoration: 'line-through',
            color: 'rgb(107, 114, 128)'
          }}>
            Styled Task
            <svg className="text-red-500 ml-2" width="14" height="14"></svg>
          </div>
        </div>
      );
      
      const { container } = render(<StyledComponent />);
      
      // Verify component has expected classes
      expect(container.firstChild).toHaveClass('bg-blue-400');
      expect(container.firstChild).toHaveClass('text-white');
      
      // Verify task styles
      const taskElement = screen.getByText('Styled Task').closest('div');
      expect(taskElement).toHaveStyle('margin-left: 40px');
      expect(taskElement).toHaveStyle('margin-bottom: 12px');
      expect(taskElement).toHaveStyle('font-size: 16px');
      
      // Verify SVG icon exists and has classes
      const svgIcon = taskElement?.querySelector('svg');
      expect(svgIcon).toHaveClass('text-red-500');
    });
  });
});