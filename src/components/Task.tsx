import React, { useState, useRef, useEffect } from 'react';
import { Task as TaskType, TaskPriority } from '../types';
import { Check, Trash, Edit, ChevronRight, GripVertical, Flag, X } from 'lucide-react';
import { useBoard, TOGGLE_TASK, DELETE_TASK, UPDATE_TASK, INDENT_TASK, SET_DRAGGED_TASK, REORDER_TASK, MOVE_TASK, SET_TASK_PRIORITY } from '../context/BoardContext';

interface TaskProps {
  task: TaskType;
  noteId: string;
  index: number;
  textSize: number;
}

const Task: React.FC<TaskProps> = ({ task, noteId, index, textSize }) => {
  const { state, dispatch } = useBoard();
  const [isEditing, setIsEditing] = useState(false);
  const [taskText, setTaskText] = useState(task.text);
  const [showMenu, setShowMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const priorityMenuRef = useRef<HTMLDivElement>(null);
  const taskRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  
  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Update local state when task changes
  useEffect(() => {
    setTaskText(task.text);
  }, [task.text]);
  
  // Handle paste functionality
  useEffect(() => {
    // For desktop app with Electron
    if (window.electronAPI) {
      const handlePaste = (text: string) => {
        if (document.activeElement === inputRef.current) {
          setTaskText(prev => prev + text);
        }
      };
      
      window.electronAPI.onPasteText(handlePaste);
      
      return () => {
        // Cleanup - no direct way to remove listeners with Electron's IPC
      };
    } else {
      // For web version
      const handlePaste = (e: ClipboardEvent) => {
        if (document.activeElement === inputRef.current) {
          const pastedText = e.clipboardData?.getData('text');
          if (pastedText) {
            setTaskText(prev => prev + pastedText);
          }
        }
      };
      
      document.addEventListener('paste', handlePaste);
      
      return () => {
        document.removeEventListener('paste', handlePaste);
      };
    }
  }, []);
  
  // Toggle task completion
  const handleToggle = () => {
    if (!task || !task.id) return;
    
    dispatch({
      type: TOGGLE_TASK,
      payload: { noteId, taskId: task.id }
    });
  };
  
  // Delete task
  const handleDelete = () => {
    if (!task || !task.id) return;
    
    dispatch({
      type: DELETE_TASK,
      payload: { noteId, taskId: task.id }
    });
    setShowMenu(false);
  };
  
  // Start editing task
  const handleEdit = () => {
    setIsEditing(true);
    setShowMenu(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };
  
  // Save task changes
  const handleSave = () => {
    if (!task || !task.id) return;
    
    if (taskText.trim()) {
      dispatch({
        type: UPDATE_TASK,
        payload: { noteId, taskId: task.id, text: taskText }
      });
    }
    setIsEditing(false);
  };
  
  // Handle key presses during editing
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!task || !task.id) return;
    
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setTaskText(task.text);
      setIsEditing(false);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      dispatch({
        type: INDENT_TASK,
        payload: { 
          noteId, 
          taskId: task.id, 
          direction: e.shiftKey ? 'left' : 'right' 
        }
      });
    }
  };
  
  // Toggle context menu with proper positioning
  const toggleMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Stop event propagation
    
    if (showMenu) {
      setShowMenu(false);
      setShowPriorityMenu(false); // Also close priority menu
      return;
    }
    
    // Set the position based on click coordinates
    setMenuPosition({
      x: e.clientX,
      y: e.clientY
    });
    
    setShowMenu(true);
  };
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && 
          !taskRef.current?.contains(event.target as Node)) {
        setShowMenu(false);
        setShowPriorityMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Ensure menu stays within viewport bounds
  useEffect(() => {
    if (showMenu && menuRef.current) {
      const menu = menuRef.current;
      const menuRect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      
      // Check if menu overflows to the right
      if (menuPosition.x + menuRect.width > viewportWidth) {
        const newX = Math.max(0, viewportWidth - menuRect.width);
        menu.style.left = `${newX}px`;
        menu.style.right = 'auto';
      } else {
        menu.style.left = `${menuPosition.x}px`;
        menu.style.right = 'auto';
      }
      
      // Check if menu overflows to the bottom
      if (menuPosition.y + menuRect.height > viewportHeight) {
        const newY = Math.max(0, viewportHeight - menuRect.height);
        menu.style.top = `${newY}px`;
        menu.style.bottom = 'auto';
      } else {
        menu.style.top = `${menuPosition.y}px`;
        menu.style.bottom = 'auto';
      }
    }
  }, [showMenu, menuPosition]);
  
  // Toggle priority menu
  const handleTogglePriorityMenu = (e: React.MouseEvent) => {
    if (!e) return;
    e.stopPropagation(); // Prevent closing the parent menu
    setShowPriorityMenu(!showPriorityMenu);
  };
  
  // Set task priority
  const handleSetPriority = (priority: TaskPriority) => {
    if (!task || !task.id) return;
    
    dispatch({
      type: SET_TASK_PRIORITY,
      payload: { noteId, taskId: task.id, priority }
    });
    setShowPriorityMenu(false);
    setShowMenu(false);
  };
  
  // Render priority flag based on priority level
  const renderPriorityFlag = () => {
    if (!task || task.priority === 'none') return null;
    
    const priorityColors = {
      low: 'text-blue-500',
      medium: 'text-yellow-500',
      high: 'text-red-500'
    };
    
    return (
      <span className={`mr-2 ${priorityColors[task.priority]}`}>
        <Flag size={14} />
      </span>
    );
  };
  
  // Find all subtasks for a given task
  const findSubtasks = (tasks: TaskType[], parentIndex: number, parentIndentation: number) => {
    const subtasks: number[] = [];
    
    for (let i = parentIndex + 1; i < tasks.length; i++) {
      if (tasks[i].indentation <= parentIndentation) {
        break;
      }
      subtasks.push(i);
    }
    
    return subtasks;
  };
  
  // Drag handling
  const handleDragStart = (e: React.DragEvent) => {
    if (!task || !task.id || !state) return;
    
    // Get the current note's tasks
    const note = (state.notes || []).find(n => n.id === noteId);
    if (!note) return;
    
    // Find subtasks
    const subtaskIndices = findSubtasks(note.tasks || [], index, task.indentation || 0);
    
    // Set data for drag operation
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.setData('noteId', noteId);
    e.dataTransfer.setData('index', index.toString());
    e.dataTransfer.setData('hasSubtasks', subtaskIndices.length > 0 ? 'true' : 'false');
    e.dataTransfer.setData('subtaskIndices', JSON.stringify(subtaskIndices));
    
    // Set dragged task in state
    dispatch({
      type: SET_DRAGGED_TASK,
      payload: { taskId: task.id, noteId, isDragging: true }
    });
    
    // Add a visual effect
    setTimeout(() => {
      if (taskRef.current) {
        taskRef.current.style.opacity = '0.4';
      }
      
      // Also apply visual effect to subtasks
      subtaskIndices.forEach(i => {
        const subtaskElement = document.querySelector(`[data-task-index="${i}"][data-note-id="${noteId}"]`);
        if (subtaskElement) {
          (subtaskElement as HTMLElement).style.opacity = '0.4';
        }
      });
    }, 0);
  };
  
  const handleDragEnd = () => {
    if (!state) return;
    
    // Reset visual effects
    if (taskRef.current) {
      taskRef.current.style.opacity = '1';
    }
    
    // Reset opacity for all tasks (including subtasks)
    document.querySelectorAll('.task-item').forEach(element => {
      (element as HTMLElement).style.opacity = '1';
    });
    
    // Reset dragged task state
    dispatch({
      type: SET_DRAGGED_TASK,
      payload: { taskId: null, noteId: null, isDragging: false }
    });
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    
    // Only process if we're dragging a task
    if (!state?.draggedTask?.isDragging || !state.draggedTask.taskId) return;
    
    // Add visual indicator for drop target
    if (taskRef.current) {
      const mouseY = e.clientY;
      const rect = taskRef.current.getBoundingClientRect();
      const middleY = rect.top + rect.height / 2;
      
      // Clear existing classes
      taskRef.current.classList.remove('border-t-2', 'border-b-2', 'border-blue-500');
      
      // Add indicator based on mouse position
      if (mouseY < middleY) {
        taskRef.current.classList.add('border-t-2', 'border-blue-500');
      } else {
        taskRef.current.classList.add('border-b-2', 'border-blue-500');
      }
    }
  };
  
  const handleDragLeave = () => {
    // Remove visual indicators
    if (taskRef.current) {
      taskRef.current.classList.remove('border-t-2', 'border-b-2', 'border-blue-500');
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    // Remove visual indicators
    if (taskRef.current) {
      taskRef.current.classList.remove('border-t-2', 'border-b-2', 'border-blue-500');
    }
    
    // Get data from drag operation
    const draggedTaskId = e.dataTransfer.getData('taskId');
    const sourceNoteId = e.dataTransfer.getData('noteId');
    const sourceIndex = parseInt(e.dataTransfer.getData('index'));
    const hasSubtasks = e.dataTransfer.getData('hasSubtasks') === 'true';
    let subtaskIndices: number[] = [];
    
    try {
      subtaskIndices = JSON.parse(e.dataTransfer.getData('subtaskIndices') || '[]');
    } catch (error) {
      console.error('Error parsing subtask indices:', error);
      subtaskIndices = [];
    }
    
    // Determine drop position (before or after this task)
    const mouseY = e.clientY;
    const rect = taskRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const middleY = rect.top + rect.height / 2;
    const targetIndex = mouseY < middleY ? index : index + 1;
    
    // If dropping in same note, reorder tasks
    if (sourceNoteId === noteId) {
      dispatch({
        type: REORDER_TASK,
        payload: {
          noteId,
          sourceIndex,
          targetIndex: targetIndex > sourceIndex ? targetIndex - 1 : targetIndex,
          hasSubtasks,
          subtaskIndices
        }
      });
    } else {
      // If dropping in different note, move task to new note
      dispatch({
        type: MOVE_TASK,
        payload: {
          sourceNoteId,
          targetNoteId: noteId,
          taskId: draggedTaskId,
          hasSubtasks,
          subtaskIndices
        }
      });
    }
  };
  
  // Calculate new position for priority menu
  const calculatePriorityMenuPosition = () => {
    if (!menuRef.current) return { top: 0, left: 0 };
    
    const rect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    
    // Check if there's room to the right
    const isNearRightEdge = rect.right + 150 > viewportWidth;
    // Check if there's room below
    const isNearBottomEdge = rect.bottom + 200 > viewportHeight;
    
    let top, left;
    
    // Position horizontally
    if (isNearRightEdge) {
      // Place to the left of the main menu
      left = rect.left - 150;
      if (left < 0) left = 5; // Don't go off screen
    } else {
      // Place to the right of the main menu
      left = rect.right + 5;
    }
    
    // Position vertically
    if (isNearBottomEdge) {
      // Place above the option in the main menu
      top = rect.top + 30 - 120; // Approximate menu height
      if (top < 0) top = 5; // Don't go off screen
    } else {
      // Align with the option in the main menu
      top = rect.top + 30; // Approximate position of priority option
    }
    
    return { top, left };
  };
  
  const priorityMenuPosition = calculatePriorityMenuPosition();
  
  return (
    <div 
      ref={taskRef}
      className={`group flex items-start relative transition-all task-item ${
        task.completed ? 'opacity-60' : ''
      }`}
      style={{ 
        marginLeft: `${(task.indentation || 0) * 20}px`,
        marginBottom: `${state?.notes?.find(n => n.id === noteId)?.taskSpacing || 8}px`,
        fontSize: `${textSize}px`
      }}
      onContextMenu={toggleMenu}
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-task-index={index}
      data-note-id={noteId}
    >
      <div className="flex-shrink-0 cursor-grab pr-1">
        <GripVertical size={16} className="text-gray-400 hover:text-gray-600" />
      </div>
      
      <button
        className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded border ${
          task.completed 
            ? 'bg-blue-500 border-blue-600 text-white' 
            : 'border-gray-400 hover:border-blue-500'
        } flex items-center justify-center transition-colors`}
        onClick={handleToggle}
        aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
      >
        {task.completed && <Check size={14} />}
      </button>
      
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          className="ml-2 flex-grow px-2 py-0.5 border border-blue-400 rounded focus:outline-none"
          value={taskText}
          onChange={(e) => setTaskText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          style={{ fontSize: `${textSize}px` }}
        />
      ) : (
        <div 
          className={`ml-2 flex-grow py-0.5 flex items-center ${
            task.completed ? 'line-through text-gray-500' : ''
          }`}
          onClick={handleEdit}
          style={{ fontSize: `${textSize}px` }}
        >
          {/* Display priority flag before task text */}
          {renderPriorityFlag()}
          {task.text}
        </div>
      )}
      
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="ml-2 text-gray-500 hover:text-blue-600 transition-colors"
          onClick={handleEdit}
          aria-label="Edit task"
        >
          <Edit size={14} />
        </button>
      </div>
      
      {/* Context Menu - Fixed position at cursor location */}
      {showMenu && (
        <div 
          ref={menuRef}
          className="fixed z-[50] bg-white rounded shadow-lg py-1 min-w-32 context-menu"
          style={{ 
            top: `${menuPosition.y}px`,
            left: `${menuPosition.x}px`,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
        >
          <button 
            className="flex items-center w-full px-4 py-1.5 text-left hover:bg-gray-100"
            onClick={handleToggle}
            type="button"
          >
            <Check size={14} className="mr-2" />
            {task.completed ? 'Mark incomplete' : 'Mark complete'}
          </button>
          <button 
            className="flex items-center w-full px-4 py-1.5 text-left hover:bg-gray-100"
            onClick={handleEdit}
            type="button"
          >
            <Edit size={14} className="mr-2" />
            Edit task
          </button>
          <div className="relative">
            <button 
              className="flex items-center w-full px-4 py-1.5 text-left hover:bg-gray-100 relative"
              onClick={handleTogglePriorityMenu}
              type="button"
            >
              <Flag size={14} className="mr-2" />
              Set priority
              <ChevronRight size={14} className="absolute right-2" />
            </button>
            
            {/* Priority Sub-menu */}
            {showPriorityMenu && (
              <div 
                ref={priorityMenuRef}
                className="fixed z-[100] bg-white rounded shadow-lg py-1 min-w-32 submenu priority-menu"
                style={{ 
                  top: `${priorityMenuPosition.top}px`,
                  left: `${priorityMenuPosition.left}px`
                }}
              >
                <button 
                  className="flex items-center w-full px-4 py-1.5 text-left hover:bg-gray-100"
                  onClick={() => handleSetPriority('none')}
                  type="button"
                >
                  <X size={14} className="mr-2 text-gray-500" />
                  None
                </button>
                <button 
                  className="flex items-center w-full px-4 py-1.5 text-left hover:bg-gray-100"
                  onClick={() => handleSetPriority('low')}
                  type="button"
                >
                  <Flag size={14} className="mr-2 text-blue-500" />
                  Low
                </button>
                <button 
                  className="flex items-center w-full px-4 py-1.5 text-left hover:bg-gray-100"
                  onClick={() => handleSetPriority('medium')}
                  type="button"
                >
                  <Flag size={14} className="mr-2 text-yellow-500" />
                  Medium
                </button>
                <button 
                  className="flex items-center w-full px-4 py-1.5 text-left hover:bg-gray-100"
                  onClick={() => handleSetPriority('high')}
                  type="button"
                >
                  <Flag size={14} className="mr-2 text-red-500" />
                  High
                </button>
              </div>
            )}
          </div>
          <button 
            className="flex items-center w-full px-4 py-1.5 text-left hover:bg-gray-100 text-red-600"
            onClick={handleDelete}
            type="button"
          >
            <Trash size={14} className="mr-2" />
            Delete task
          </button>
          <div className="border-t border-gray-200 my-1"></div>
          <button 
            className="flex items-center w-full px-4 py-1.5 text-left hover:bg-gray-100"
            onClick={() => {
              if (!task || !task.id) return;
              
              dispatch({
                type: INDENT_TASK,
                payload: { noteId, taskId: task.id, direction: 'right' }
              });
              setShowMenu(false);
            }}
            type="button"
          >
            <ChevronRight size={14} className="mr-2" />
            Indent
          </button>
          <button 
            className="flex items-center w-full px-4 py-1.5 text-left hover:bg-gray-100"
            onClick={() => {
              if (!task || !task.id) return;
              
              dispatch({
                type: INDENT_TASK,
                payload: { noteId, taskId: task.id, direction: 'left' }
              });
              setShowMenu(false);
            }}
            type="button"
          >
            <ChevronRight size={14} className="mr-2 rotate-180" />
            Outdent
          </button>
        </div>
      )}
    </div>
  );
};

export default Task;