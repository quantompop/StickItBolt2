import React, { useState, useRef, useEffect } from 'react';
import { Note as NoteType, NoteColor } from '../types';
import { X, MoreVertical, Plus, Trash, Edit, Palette, Type, AlignJustify, Search, Paperclip as PaperClip } from 'lucide-react';
import Task from './Task';
import ColorPicker from './ColorPicker';
import SliderControl from './SliderControl';
import FileAttachments from './FileAttachments';
import { 
  useBoard, 
  DELETE_NOTE, 
  UPDATE_NOTE, 
  ADD_TASK, 
  MOVE_NOTE, 
  CHANGE_NOTE_COLOR, 
  CHANGE_TEXT_SIZE, 
  CHANGE_TASK_SPACING,
  SET_SEARCH,
  CLEAR_SEARCH
} from '../context/BoardContext';
import { getNoteColorClass, getTextColorForBackground } from '../utils/helpers';

interface NoteProps {
  note: NoteType;
}

const Note: React.FC<NoteProps> = ({ note }) => {
  const { state, dispatch } = useBoard();
  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTextSizeControls, setShowTextSizeControls] = useState(false);
  const [showSpacingControls, setShowSpacingControls] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [title, setTitle] = useState(note.title);
  const [newTask, setNewTask] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const taskInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  
  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Update local state when note changes
  useEffect(() => {
    setTitle(note.title);
  }, [note.title]);
  
  // Handle paste functionality
  useEffect(() => {
    // For desktop app with Electron
    if (window.electronAPI) {
      const handlePaste = (text: string) => {
        if (document.activeElement === taskInputRef.current) {
          setNewTask(prev => prev + text);
        }
      };
      
      window.electronAPI.onPasteText(handlePaste);
      
      return () => {
        // Cleanup - no direct way to remove listeners with Electron's IPC
      };
    } else {
      // For web version
      const handlePaste = (e: ClipboardEvent) => {
        if (document.activeElement === taskInputRef.current) {
          const pastedText = e.clipboardData?.getData('text');
          if (pastedText) {
            setNewTask(prev => prev + pastedText);
          }
        }
      };
      
      document.addEventListener('paste', handlePaste);
      
      return () => {
        document.removeEventListener('paste', handlePaste);
      };
    }
  }, []);
  
  // Delete the note
  const handleDelete = () => {
    if (!note || !note.id) return;
    
    dispatch({
      type: DELETE_NOTE,
      payload: { id: note.id }
    });
  };
  
  // Update note title
  const handleTitleChange = () => {
    if (!note || !note.id) return;
    
    if (title.trim()) {
      dispatch({
        type: UPDATE_NOTE,
        payload: { id: note.id, title }
      });
      setIsEditing(false);
    }
  };
  
  // Handle key presses during title editing
  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleChange();
    } else if (e.key === 'Escape') {
      setTitle(note.title);
      setIsEditing(false);
    }
  };
  
  // Add a new task
  const handleAddTask = () => {
    if (!note || !note.id) return;
    
    if (newTask.trim()) {
      // Split by newlines to handle multi-line paste
      const taskLines = newTask.split(/\r?\n/).filter(line => line.trim() !== '');
      
      // Add each line as a separate task
      taskLines.forEach(text => {
        dispatch({
          type: ADD_TASK,
          payload: { noteId: note.id, text }
        });
      });
      
      setNewTask('');
      // Focus back on the input for quick task creation
      setTimeout(() => {
        taskInputRef.current?.focus();
      }, 0);
    }
  };
  
  // Change note color
  const handleColorChange = (color: NoteColor) => {
    if (!note || !note.id) return;
    
    dispatch({
      type: CHANGE_NOTE_COLOR,
      payload: { id: note.id, color }
    });
    setShowColorPicker(false);
    setShowMenu(false);
  };
  
  // Change text size
  const handleTextSizeChange = (size: number) => {
    if (!note || !note.id) return;
    
    dispatch({
      type: CHANGE_TEXT_SIZE,
      payload: { id: note.id, size }
    });
  };
  
  // Change task spacing
  const handleTaskSpacingChange = (spacing: number) => {
    if (!note || !note.id) return;
    
    dispatch({
      type: CHANGE_TASK_SPACING,
      payload: { id: note.id, spacing }
    });
  };
  
  // Handle key presses for new task input
  const handleNewTaskKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTask();
    }
  };
  
  // Toggle menu display with proper positioning
  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (showMenu) {
      setShowMenu(false);
      return;
    }
    
    // Get the position of the button that was clicked
    if (menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        x: rect.right,
        y: rect.bottom
      });
    }
    
    setShowMenu(true);
    setShowColorPicker(false);
    setShowTextSizeControls(false);
    setShowSpacingControls(false);
    setShowSearch(false);
    setShowAttachments(false);
  };
  
  // Start editing the title
  const startEditing = () => {
    setIsEditing(true);
    setShowMenu(false);
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 0);
  };
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && 
          menuButtonRef.current && !menuButtonRef.current.contains(event.target as Node)) {
        setShowMenu(false);
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
        menu.style.left = 'auto';
        menu.style.right = '0';
      } else {
        menu.style.left = `${menuPosition.x}px`;
        menu.style.right = 'auto';
      }
      
      // Check if menu overflows to the bottom
      if (menuPosition.y + menuRect.height > viewportHeight) {
        menu.style.top = 'auto';
        menu.style.bottom = '0';
      } else {
        menu.style.top = `${menuPosition.y}px`;
        menu.style.bottom = 'auto';
      }
    }
  }, [showMenu, menuPosition]);
  
  // Dragging functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start dragging if clicking on the header (not buttons or inputs)
    if ((e.target as HTMLElement).closest('.note-controls')) {
      return;
    }
    
    if ((e.target as HTMLElement).closest('.note-header')) {
      setIsDragging(true);
      
      // Calculate offset from the mouse position to the top-left corner of the note
      const noteRect = noteRef.current?.getBoundingClientRect();
      if (noteRect) {
        setDragOffset({
          x: e.clientX - noteRect.left,
          y: e.clientY - noteRect.top
        });
      }
      
      // Prevent text selection during drag
      e.preventDefault();
    }
  };
  
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && noteRef.current && dragOffset && typeof e.clientX === 'number' && typeof e.clientY === 'number') {
      const x = e.clientX - dragOffset.x;
      const y = e.clientY - dragOffset.y;
      
      // Update note position in state
      dispatch({
        type: MOVE_NOTE,
        payload: { id: note.id, position: { x, y } }
      });
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Add and remove event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);
  
  // Handle task drop directly on note
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    // Get data from drag operation
    const draggedTaskId = e.dataTransfer.getData('taskId');
    const sourceNoteId = e.dataTransfer.getData('noteId');
    
    // Only process if it's a task from another note
    if (draggedTaskId && sourceNoteId && sourceNoteId !== note.id) {
      dispatch({
        type: 'MOVE_TASK',
        payload: {
          sourceNoteId,
          targetNoteId: note.id,
          taskId: draggedTaskId
        }
      });
    }
  };
  
  // Handle search in this note
  const handleSearch = () => {
    if (!note || !note.id) return;
    
    dispatch({
      type: SET_SEARCH,
      payload: { 
        term: searchTerm, 
        scope: 'note',
        noteId: note.id 
      }
    });
  };
  
  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
    dispatch({
      type: CLEAR_SEARCH
    });
  };
  
  // Initialize search input when opened
  useEffect(() => {
    if (showSearch) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    }
  }, [showSearch]);
  
  // Filter tasks if search is active for this note
  const filteredTasks = (note.tasks || []).filter(task => {
    if (!state?.search?.isActive) return true;
    if (state.search.scope === 'note' && state.search.noteId === note.id) {
      return task.text.toLowerCase().includes(state.search.term.toLowerCase());
    }
    if (state.search.scope === 'global') {
      return task.text.toLowerCase().includes(state.search.term.toLowerCase());
    }
    return true;
  });
  
  // Apply position styles
  const noteStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${note.position?.x || 0}px`,
    top: `${note.position?.y || 0}px`,
    cursor: isDragging ? 'grabbing' : 'grab'
  };
  
  // Get color classes
  const colorClass = getNoteColorClass(note.color);
  const textColorClass = getTextColorForBackground(note.color);
  
  // Close text size controls with proper focus management
  const handleCloseTextSizeControls = () => {
    setShowTextSizeControls(false);
    setShowMenu(false);
    // Return focus to the menu button for better keyboard navigation
    menuButtonRef.current?.focus();
  };
  
  // Close task spacing controls with proper focus management
  const handleCloseSpacingControls = () => {
    setShowSpacingControls(false);
    setShowMenu(false);
    // Return focus to the menu button for better keyboard navigation
    menuButtonRef.current?.focus();
  };
  
  return (
    <div 
      ref={noteRef}
      className={`w-64 rounded-lg shadow-lg ${colorClass} overflow-hidden`}
      style={noteStyle}
      onMouseDown={handleMouseDown}
    >
      {/* Note Header */}
      <div className={`note-header px-3 py-2 flex items-center justify-between ${textColorClass}`}>
        {isEditing ? (
          <input
            ref={titleInputRef}
            type="text"
            className="bg-transparent border-b border-gray-700 focus:outline-none w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleChange}
            onKeyDown={handleTitleKeyDown}
          />
        ) : (
          <h3 
            className="font-medium truncate cursor-pointer" 
            onClick={startEditing}
          >
            {note.title}
          </h3>
        )}
        
        <div className="note-controls flex items-center space-x-1">
          <button
            ref={menuButtonRef}
            className="p-1 rounded-full hover:bg-black/10 transition-colors"
            onClick={toggleMenu}
            aria-label="More options"
          >
            <MoreVertical size={16} />
          </button>
          <button
            className="p-1 rounded-full hover:bg-black/10 transition-colors"
            onClick={handleDelete}
            aria-label="Delete note"
          >
            <X size={16} />
          </button>
        </div>
        
        {/* Note Menu - Fixed to always display in viewport */}
        {showMenu && (
          <div 
            ref={menuRef}
            className="fixed z-50 bg-white rounded shadow-lg py-1 min-w-40 context-menu"
          >
            <button 
              className="flex items-center w-full px-4 py-1.5 text-left hover:bg-gray-100 text-gray-700"
              onClick={startEditing}
            >
              <Edit size={14} className="mr-2" />
              Rename note
            </button>
            <button 
              className="flex items-center w-full px-4 py-1.5 text-left hover:bg-gray-100 text-gray-700"
              onClick={() => {
                setShowColorPicker(true);
                setShowTextSizeControls(false);
                setShowSpacingControls(false);
                setShowSearch(false);
                setShowAttachments(false);
              }}
            >
              <Palette size={14} className="mr-2" />
              Change color
            </button>
            <button 
              className="flex items-center w-full px-4 py-1.5 text-left hover:bg-gray-100 text-gray-700"
              onClick={() => {
                setShowTextSizeControls(true);
                setShowColorPicker(false);
                setShowSpacingControls(false);
                setShowSearch(false);
                setShowAttachments(false);
              }}
            >
              <Type size={14} className="mr-2" />
              Text size
            </button>
            <button 
              className="flex items-center w-full px-4 py-1.5 text-left hover:bg-gray-100 text-gray-700"
              onClick={() => {
                setShowSpacingControls(true);
                setShowColorPicker(false);
                setShowTextSizeControls(false);
                setShowSearch(false);
                setShowAttachments(false);
              }}
            >
              <AlignJustify size={14} className="mr-2" />
              Task spacing
            </button>
            <button 
              className="flex items-center w-full px-4 py-1.5 text-left hover:bg-gray-100 text-gray-700"
              onClick={() => {
                setShowSearch(true);
                setShowColorPicker(false);
                setShowTextSizeControls(false);
                setShowSpacingControls(false);
                setShowAttachments(false);
              }}
            >
              <Search size={14} className="mr-2" />
              Search in note
            </button>
            <button 
              className="flex items-center w-full px-4 py-1.5 text-left hover:bg-gray-100 text-gray-700"
              onClick={() => {
                setShowAttachments(true);
                setShowSearch(false);
                setShowColorPicker(false);
                setShowTextSizeControls(false);
                setShowSpacingControls(false);
              }}
            >
              <PaperClip size={14} className="mr-2" />
              Attachments
            </button>
            <button 
              className="flex items-center w-full px-4 py-1.5 text-left hover:bg-gray-100 text-red-600"
              onClick={handleDelete}
            >
              <Trash size={14} className="mr-2" />
              Delete note
            </button>
          </div>
        )}
        
        {/* Color Picker */}
        {showColorPicker && (
          <div 
            className="fixed z-50 bg-white rounded shadow-lg context-menu"
            style={{
              top: menuPosition.y + 'px',
              left: menuPosition.x + 'px'
            }}
          >
            <ColorPicker 
              currentColor={note.color} 
              onColorSelect={handleColorChange} 
            />
          </div>
        )}
        
        {/* Text Size Controls */}
        {showTextSizeControls && (
          <div 
            className="fixed z-50 context-menu"
            style={{
              top: menuPosition.y + 'px',
              left: menuPosition.x + 'px'
            }}
          >
            <SliderControl 
              value={note.textSize}
              min={10}
              max={20}
              step={1}
              onChange={handleTextSizeChange}
              onClose={handleCloseTextSizeControls}
              label="Text Size"
              decreaseLabel="Smaller"
              increaseLabel="Larger"
              unit="px"
            />
          </div>
        )}
        
        {/* Task Spacing Controls */}
        {showSpacingControls && (
          <div 
            className="fixed z-50 context-menu"
            style={{
              top: menuPosition.y + 'px',
              left: menuPosition.x + 'px'
            }}
          >
            <SliderControl 
              value={note.taskSpacing}
              min={2}
              max={16}
              step={1}
              onChange={handleTaskSpacingChange}
              onClose={handleCloseSpacingControls}
              label="Task Spacing"
              decreaseLabel="Tighter"
              increaseLabel="Looser"
              unit="px"
            />
          </div>
        )}
        
        {/* Search Controls */}
        {showSearch && (
          <div 
            className="fixed z-50 bg-white rounded shadow-lg p-3 w-48 context-menu"
            style={{
              top: menuPosition.y + 'px',
              left: menuPosition.x + 'px'
            }}
          >
            <div className="mb-2 font-medium text-gray-700">Search in Note</div>
            <div className="flex flex-col space-y-2">
              <input 
                ref={searchInputRef}
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search tasks..."
                className="w-full px-2 py-1 border border-gray-300 rounded"
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleSearch}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-sm"
                >
                  Search
                </button>
                <button
                  onClick={clearSearch}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded text-sm"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Attachments Panel */}
        {showAttachments && (
          <div 
            className="fixed z-50 bg-white rounded shadow-lg p-3 w-72 context-menu"
            style={{
              top: menuPosition.y + 'px',
              left: menuPosition.x + 'px'
            }}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="font-medium text-gray-700">Attachments</div>
              <button
                onClick={() => setShowAttachments(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>
            <FileAttachments 
              noteId={note.id} 
              attachments={note.attachments || []} 
            />
          </div>
        )}
      </div>
      
      {/* Note Content */}
      <div 
        className="note-content p-3 bg-white bg-opacity-90 min-h-32 max-h-80 overflow-y-auto"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Search Active Indicator */}
        {state?.search?.isActive && (state.search.scope === 'global' || 
          (state.search.scope === 'note' && state.search.noteId === note.id)) && (
          <div className="mb-2 px-2 py-1 bg-blue-50 border border-blue-100 rounded-md text-sm flex justify-between items-center">
            <span>
              Searching: <strong>{state.search.term}</strong>
            </span>
            <button 
              onClick={clearSearch}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Attachments Indicator */}
        {note.attachments && note.attachments.length > 0 && (
          <div 
            className="mb-2 px-2 py-1 bg-green-50 border border-green-100 rounded-md text-sm flex justify-between items-center cursor-pointer"
            onClick={() => {
              setShowAttachments(true);
              setShowMenu(true);
            }}
          >
            <span className="flex items-center">
              <PaperClip size={14} className="mr-1 text-green-600" />
              {note.attachments.length} attachment{note.attachments.length !== 1 ? 's' : ''}
            </span>
            <button 
              className="text-green-600 hover:text-green-800"
              aria-label="Manage attachments"
            >
              <MoreVertical size={14} />
            </button>
          </div>
        )}
        
        {/* Tasks */}
        <div className="mb-4">
          {filteredTasks.map((task, index) => (
            <Task 
              key={task.id} 
              task={task} 
              noteId={note.id} 
              index={index}
              textSize={note.textSize || 14}
            />
          ))}
          
          {/* No results message */}
          {state?.search?.isActive && filteredTasks.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              No matching tasks found
            </div>
          )}
        </div>
        
        {/* Add Task Input */}
        <div className="flex items-center">
          <input
            ref={taskInputRef}
            type="text"
            className="flex-grow border border-gray-300 rounded-l px-2 py-1 focus:outline-none focus:border-blue-400"
            placeholder="Add a task..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={handleNewTaskKeyDown}
            style={{ fontSize: `${note.textSize || 14}px` }}
          />
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-r transition-colors"
            onClick={handleAddTask}
            aria-label="Add task"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Quick Attachments Button */}
        <div className="mt-2">
          <button
            className="text-sm text-blue-500 hover:text-blue-700 flex items-center"
            onClick={() => {
              setShowAttachments(true);
              setShowMenu(true);
            }}
          >
            <PaperClip size={14} className="mr-1" />
            {note.attachments && note.attachments.length > 0 
              ? `Manage attachments (${note.attachments.length})` 
              : 'Add attachments'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Note;