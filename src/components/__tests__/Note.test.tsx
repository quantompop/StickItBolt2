import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Note as NoteType } from '../../types';
import userEvent from '@testing-library/user-event';

// Mock the context hooks
vi.mock('../../context/BoardContext', async () => {
  const actual = await vi.importActual('../../context/BoardContext');
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
        }
      },
      dispatch: mockDispatch
    })),
    BoardProvider: ({ children }) => <>{children}</>
  };
});

// Mock components
vi.mock('../../components/Task', () => ({
  default: ({ task }) => <div data-testid="task-item">{task.text}</div>
}));

vi.mock('../../components/ColorPicker', () => ({
  default: ({ onColorSelect }) => (
    <div>
      Color Picker
      <button onClick={() => onColorSelect('blue')}>Blue</button>
    </div>
  )
}));

vi.mock('../../components/SliderControl', () => ({
  default: ({ value, onChange }) => (
    <div>
      Slider Control: {value}
      <button onClick={() => onChange(value + 1)}>Increase</button>
    </div>
  )
}));

describe('Note Component', () => {
  let Note: React.ComponentType<{note: NoteType}>;
  let mockDispatch: jest.Mock;

  // Import the component before each test to ensure fresh mocks
  beforeEach(async () => {
    // Clear mocks
    vi.clearAllMocks();
    
    // Dynamically import the component
    const NoteModule = await import('../../components/Note');
    Note = NoteModule.default;
    
    // Get the mock dispatch from context
    const BoardContext = await import('../../context/BoardContext');
    mockDispatch = vi.fn();
    vi.mocked(BoardContext.useBoard).mockReturnValue({
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
        }
      },
      dispatch: mockDispatch
    });
  });

  it('should render note with correct title and tasks', async () => {
    const mockNote: NoteType = {
      id: 'note-123',
      title: 'Test Note',
      color: 'yellow',
      position: { x: 100, y: 100 },
      tasks: [
        {
          id: 'task-1',
          text: 'Task 1',
          completed: false,
          indentation: 0,
          priority: 'none'
        },
        {
          id: 'task-2',
          text: 'Task 2',
          completed: true,
          indentation: 1,
          priority: 'high'
        }
      ],
      textSize: 14,
      taskSpacing: 8
    };

    // Render with our imported Note component
    render(<Note note={mockNote} />);

    // Check for title and tasks
    expect(screen.getByText('Test Note')).toBeInTheDocument();
    expect(screen.getAllByTestId('task-item')).toHaveLength(2);
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });

  it('should allow editing the title', async () => {
    const mockNote: NoteType = {
      id: 'note-123',
      title: 'Test Note',
      color: 'yellow',
      position: { x: 100, y: 100 },
      tasks: [],
      textSize: 14,
      taskSpacing: 8
    };

    render(<Note note={mockNote} />);

    // Click the title to start editing
    await act(async () => {
      await userEvent.click(screen.getByText('Test Note'));
    });
    
    // Find input and edit
    const titleInput = await screen.findByDisplayValue('Test Note');
    await act(async () => {
      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, 'Updated Title');
      await userEvent.tab(); // Blur to save
    });
    
    // Check dispatch call
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'UPDATE_NOTE',
        payload: expect.objectContaining({
          id: 'note-123',
          title: 'Updated Title'
        })
      })
    );
  });

  it('should allow adding a new task', async () => {
    const mockNote: NoteType = {
      id: 'note-123',
      title: 'Test Note',
      color: 'yellow',
      position: { x: 100, y: 100 },
      tasks: [],
      textSize: 14,
      taskSpacing: 8
    };

    render(<Note note={mockNote} />);

    // Find task input and add new task
    const taskInput = screen.getByPlaceholderText('Add a task...');
    await act(async () => {
      await userEvent.type(taskInput, 'New Task');
      await userEvent.keyboard('{Enter}');
    });
    
    // Check dispatch call
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ADD_TASK',
        payload: expect.objectContaining({
          noteId: 'note-123',
          text: 'New Task'
        })
      })
    );
  });

  it('should apply the correct color class based on note color', async () => {
    const mockNote: NoteType = {
      id: 'note-123',
      title: 'Test Note',
      color: 'yellow',
      position: { x: 100, y: 100 },
      tasks: [],
      textSize: 14,
      taskSpacing: 8
    };

    const { container } = render(<Note note={mockNote} />);

    // Check color classes
    expect(container.firstChild).toHaveClass('bg-amber-200');
  });
});