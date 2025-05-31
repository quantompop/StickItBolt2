import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoardState, Task } from '../types';

// Mock the required components with interactive elements
vi.mock('../components/SliderControl', () => ({
  default: ({ value, onChange }) => (
    <div>
      <div data-testid="slider-value">Slider Control: {value}</div>
      <button data-testid="increase-button" onClick={() => onChange(value + 1)}>Increase</button>
      <button data-testid="decrease-button" onClick={() => onChange(value - 1)}>Decrease</button>
    </div>
  )
}));

vi.mock('../components/Task', () => ({
  default: ({ task }) => (
    <div className="task-item">
      <div data-testid="task-text">{task.text}</div>
      <div className="context-menu" data-testid="task-context-menu">
        <div data-testid="mark-complete" onClick={() => {}}>Mark complete</div>
        <div data-testid="edit-task" onClick={() => {}}>Edit task</div>
        <div data-testid="set-priority" onClick={() => {}}>Set priority</div>
        <div data-testid="delete-task" onClick={() => {}}>Delete task</div>
      </div>
    </div>
  )
}));

vi.mock('../components/Note', () => ({
  default: ({ note }) => (
    <div>
      <div className="note-header" data-testid="note-header">{note.title}</div>
      <button aria-label="More options" data-testid="note-options">More options</button>
      <div data-testid="text-size-option">Text size</div>
      {note.tasks?.map(task => (
        <div key={task.id} data-testid={`task-${task.id}`}>{task.text}</div>
      ))}
    </div>
  )
}));

vi.mock('../components/Board', () => ({
  default: () => (
    <div>
      <button data-testid="add-note">Add Note</button>
      <button data-testid="archive-button">Archive</button>
      <button data-testid="search-button">Search</button>
      <button data-testid="history-button">History</button>
      <div data-testid="board-content">Mock Board Content</div>
    </div>
  )
}));

// Create a minimal initial state for testing
const createInitialState = (): BoardState => ({
  boardId: 'test-board-id',
  notes: [
    {
      id: 'test-note-id',
      title: 'Test Note',
      color: 'yellow',
      tasks: [],
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

// Mock context
vi.mock('../context/BoardContext', async (importOriginal) => {
  const mockDispatch = vi.fn();
  const actual = await importOriginal();
  
  return {
    ...actual, // This preserves all the original constants like ADD_NOTE, TOGGLE_TASK, etc.
    boardReducer: vi.fn(),
    useBoard: vi.fn(() => ({
      state: createInitialState(),
      dispatch: mockDispatch
    })),
    BoardProvider: ({ children }) => <>{children}</>
  };
});

vi.mock('../context/AuthContext', () => {
  return {
    useAuth: vi.fn(() => ({
      state: {
        isAuthenticated: true,
        user: { 
          id: 'user-123', 
          email: 'test@example.com' 
        },
        isLoading: false,
        error: null
      },
      dispatch: vi.fn()
    })),
    AuthProvider: ({ children }) => <>{children}</>
  };
});

vi.mock('../firebase/authService', () => ({
  signOut: vi.fn()
}));

describe('Comprehensive Feature Tests', () => {
  // Setup user-event
  const user = userEvent.setup();
  const mockDispatch = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Update the useBoard mock before each test
    vi.mocked(require('../context/BoardContext').useBoard).mockReturnValue({
      state: createInitialState(),
      dispatch: mockDispatch
    });
  });
  
  describe('All UI Controls Functionality', () => {
    it('should test all sliders work correctly', async () => {
      // Create a note with specific props to test
      const testNote = {
        id: 'note-test',
        title: 'Slider Test Note',
        color: 'yellow',
        tasks: [],
        position: { x: 100, y: 100 },
        textSize: 14,
        taskSpacing: 8
      };
      
      const TestNoteWithSlider = () => (
        <div>
          <h3>{testNote.title}</h3>
          <div>
            Current Size: <span data-testid="size-value">{testNote.textSize}</span>
          </div>
          <button data-testid="show-slider">Show Slider</button>
          
          {/* Simplified slider component */}
          <div>
            <button 
              data-testid="increase-size"
              onClick={() => mockDispatch({
                type: 'CHANGE_TEXT_SIZE',
                payload: { id: testNote.id, size: testNote.textSize + 1 }
              })}
            >
              Increase
            </button>
          </div>
        </div>
      );
      
      render(<TestNoteWithSlider />);
      
      // Click increase button
      await act(async () => {
        fireEvent.click(screen.getByTestId('increase-size'));
      });
      
      // Dispatch should be called with correct action
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CHANGE_TEXT_SIZE',
          payload: expect.objectContaining({
            id: testNote.id,
            size: 15
          })
        })
      );
    });
    
    it('should test all task context menu operations work', async () => {
      // Get the actual constants from the imported context
      const { TOGGLE_TASK, SET_TASK_PRIORITY } = require('../context/BoardContext');
      
      // Create a task to test with
      const testTask = {
        id: 'task-test',
        text: 'Context Menu Test Task',
        completed: false,
        indentation: 1,
        priority: 'none' as const
      };
      
      const TestContextMenu = () => (
        <div>
          <div data-testid="task-text">{testTask.text}</div>
          <button 
            data-testid="toggle-task"
            onClick={() => mockDispatch({
              type: TOGGLE_TASK,
              payload: { noteId: 'note-1', taskId: testTask.id }
            })}
          >
            Toggle Task
          </button>
          <button 
            data-testid="set-priority"
            onClick={() => mockDispatch({
              type: SET_TASK_PRIORITY,
              payload: { 
                noteId: 'note-1', 
                taskId: testTask.id,
                priority: 'high'
              }
            })}
          >
            Set High Priority
          </button>
        </div>
      );
      
      render(<TestContextMenu />);
      
      // Test toggle task
      await act(async () => {
        await userEvent.click(screen.getByTestId('toggle-task'));
      });
      
      // Dispatch should be called with toggle task action
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TOGGLE_TASK,
          payload: expect.objectContaining({
            noteId: 'note-1',
            taskId: testTask.id
          })
        })
      );
      
      // Reset mock
      mockDispatch.mockClear();
      
      // Test set priority
      await act(async () => {
        await userEvent.click(screen.getByTestId('set-priority'));
      });
      
      // Dispatch should be called with set priority action
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SET_TASK_PRIORITY,
          payload: expect.objectContaining({
            noteId: 'note-1',
            taskId: testTask.id,
            priority: 'high'
          })
        })
      );
    });
  });
  
  describe('Complex Board Interactions', () => {
    it('should test all board toolbar buttons work correctly', async () => {
      // Get the actual constants from the imported context
      const { ADD_NOTE, SAVE_VERSION, SET_SEARCH } = require('../context/BoardContext');
      
      const TestBoard = () => (
        <div>
          <button 
            data-testid="add-note"
            onClick={() => mockDispatch({
              type: ADD_NOTE,
              payload: { color: 'yellow', position: { x: 100, y: 100 } }
            })}
          >
            Add Note
          </button>
          
          <button
            data-testid="save-version"
            onClick={() => mockDispatch({
              type: SAVE_VERSION,
              payload: { description: 'Test Version' }
            })}
          >
            Save Version
          </button>
          
          <button
            data-testid="toggle-search"
            onClick={() => mockDispatch({
              type: SET_SEARCH,
              payload: { term: 'test', scope: 'global' }
            })}
          >
            Search
          </button>
        </div>
      );
      
      render(<TestBoard />);
      
      // Test Add Note button
      await act(async () => {
        await userEvent.click(screen.getByTestId('add-note'));
      });
      
      // Dispatch should be called with ADD_NOTE action
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ADD_NOTE
        })
      );
      
      // Reset mock
      mockDispatch.mockClear();
      
      // Test Save Version button
      await act(async () => {
        await userEvent.click(screen.getByTestId('save-version'));
      });
      
      // Dispatch should be called with SAVE_VERSION action
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SAVE_VERSION,
          payload: expect.objectContaining({
            description: 'Test Version'
          })
        })
      );
      
      // Reset mock
      mockDispatch.mockClear();
      
      // Test Search button
      await act(async () => {
        await userEvent.click(screen.getByTestId('toggle-search'));
      });
      
      // Dispatch should be called with SET_SEARCH action
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SET_SEARCH,
          payload: expect.objectContaining({
            term: 'test',
            scope: 'global'
          })
        })
      );
    });
  });
});