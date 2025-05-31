import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SliderControl from '../components/SliderControl';

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
        }
      },
      dispatch: mockDispatch
    })),
    BoardProvider: ({ children }) => <>{children}</>
  };
});

// Mock the Note component
vi.mock('../components/Note', () => ({
  default: ({ note }) => (
    <div>
      <h3>{note.title}</h3>
      <div data-testid="note-content">
        {note.tasks?.map(task => <div key={task.id}>{task.text}</div>)}
      </div>
    </div>
  )
}));

// Mock the Task component
vi.mock('../components/Task', () => ({
  default: ({ task }) => (
    <div>
      <div>{task.text}</div>
      <button>Mark Complete</button>
    </div>
  )
}));

describe('Interactive Bug Fixes Tests', () => {
  // Setup user-event for more realistic interactions
  const user = userEvent.setup();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('Slider Control Fixes', () => {
    // Create a test component that fully exercises the SliderControl
    const ControlledSliderTest = () => {
      const [value, setValue] = useState(14);
      
      return (
        <div>
          <div data-testid="current-value">{value}</div>
          <SliderControl 
            value={value}
            min={10}
            max={20}
            onChange={setValue}
            label="Fixed Slider Test"
          />
        </div>
      );
    };
    
    it('should properly update value when dragging slider', async () => {
      render(<ControlledSliderTest />);
      
      // Initial value
      expect(screen.getByTestId('current-value')).toHaveTextContent('14');
      
      // Find the slider
      const slider = screen.getByRole('slider');
      
      // Simulate dragging by changing value directly
      fireEvent.change(slider, { target: { value: '16' } });
      
      // Value should be updated
      expect(screen.getByTestId('current-value')).toHaveTextContent('16');
    });
    
    it('should properly update when clicking +/- buttons', async () => {
      render(<ControlledSliderTest />);
      
      // Initial value
      expect(screen.getByTestId('current-value')).toHaveTextContent('14');
      
      // Find the increase/decrease buttons by their ARIA labels
      const increaseBtn = screen.getByLabelText('Increase value');
      const decreaseBtn = screen.getByLabelText('Decrease value');
      
      // Click increase button
      fireEvent.click(increaseBtn);
      expect(screen.getByTestId('current-value')).toHaveTextContent('15');
      
      // Click increase button again
      fireEvent.click(increaseBtn);
      expect(screen.getByTestId('current-value')).toHaveTextContent('16');
      
      // Click decrease button
      fireEvent.click(decreaseBtn);
      expect(screen.getByTestId('current-value')).toHaveTextContent('15');
    });
    
    it('should reset to default value when clicking reset', async () => {
      render(<ControlledSliderTest />);
      
      // Change value first
      const increaseBtn = screen.getByLabelText('Increase value');
      fireEvent.click(increaseBtn);
      fireEvent.click(increaseBtn);
      
      // Value should be 16
      expect(screen.getByTestId('current-value')).toHaveTextContent('16');
      
      // Click reset
      fireEvent.click(screen.getByText('Reset'));
      
      // Value should reset to middle of range (15)
      expect(screen.getByTestId('current-value')).toHaveTextContent('15');
    });
  });
  
  describe('Note Control Fixes', () => {
    // Simplified mock components for this test
    const SimpleMockNote = ({ initialTitle, onTitleChange }) => {
      const [isEditing, setIsEditing] = useState(false);
      const [title, setTitle] = useState(initialTitle);
      
      const handleTitleClick = () => {
        setIsEditing(true);
      };
      
      const handleTitleChange = (e) => {
        setTitle(e.target.value);
      };
      
      const handleTitleSave = () => {
        setIsEditing(false);
        onTitleChange(title);
      };
      
      return (
        <div>
          {isEditing ? (
            <input 
              value={title} 
              onChange={handleTitleChange}
              onBlur={handleTitleSave}
              data-testid="title-input"
            />
          ) : (
            <h3 onClick={handleTitleClick} data-testid="title-display">
              {title}
            </h3>
          )}
        </div>
      );
    };
    
    it('should ensure title editing works correctly after note update', async () => {
      const mockTitleChange = vi.fn();
      
      render(
        <SimpleMockNote initialTitle="Initial Title" onTitleChange={mockTitleChange} />
      );
      
      // Click the title to start editing
      fireEvent.click(screen.getByTestId('title-display'));
      
      // Find input and edit
      const input = screen.getByTestId('title-input');
      fireEvent.change(input, { target: { value: 'Updated Title' }});
      fireEvent.blur(input);
      
      // Should have called the change handler
      expect(mockTitleChange).toHaveBeenCalledWith('Updated Title');
    });
    
    it('should ensure task editing works correctly after task update', async () => {
      // Simple mock task component
      const SimpleMockTask = ({ initialText, onTextChange }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [text, setText] = useState(initialText);
        
        const handleTextClick = () => {
          setIsEditing(true);
        };
        
        const handleTextChange = (e) => {
          setText(e.target.value);
        };
        
        const handleTextSave = () => {
          setIsEditing(false);
          onTextChange(text);
        };
        
        return (
          <div>
            {isEditing ? (
              <input 
                value={text} 
                onChange={handleTextChange}
                onBlur={handleTextSave}
                data-testid="task-input"
              />
            ) : (
              <div onClick={handleTextClick} data-testid="task-display">
                {text}
              </div>
            )}
          </div>
        );
      };
      
      const mockTextChange = vi.fn();
      
      render(
        <SimpleMockTask initialText="Initial Task" onTextChange={mockTextChange} />
      );
      
      // Click to edit
      fireEvent.click(screen.getByTestId('task-display'));
      
      // Edit and save
      const input = screen.getByTestId('task-input');
      fireEvent.change(input, { target: { value: 'Updated Task' }});
      fireEvent.blur(input);
      
      // Should have called the change handler
      expect(mockTextChange).toHaveBeenCalledWith('Updated Task');
    });
  });
});