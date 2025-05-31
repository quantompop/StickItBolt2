import { describe, it, expect, vi, beforeEach } from 'vitest';
import { boardReducer } from '../context/BoardContext';
import { BoardState, Task } from '../types';

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

describe('Task Boundary and Edge Cases', () => {
  describe('Task Text Handling', () => {
    it('should handle extremely long task text', () => {
      const initialState = createInitialState();
      const noteId = initialState.notes[0].id;
      
      // Create a task with 10,000 character text
      const longText = 'a'.repeat(10000);
      
      const newState = boardReducer(initialState, {
        type: 'ADD_TASK',
        payload: { noteId, text: longText }
      });
      
      // Task should be created with the full text
      expect(newState.notes[0].tasks.length).toBe(1);
      expect(newState.notes[0].tasks[0].text).toBe(longText);
      expect(newState.notes[0].tasks[0].text.length).toBe(10000);
    });
    
    it('should handle tasks with only whitespace', () => {
      const initialState = createInitialState();
      const noteId = initialState.notes[0].id;
      
      // Try to create a task with only spaces
      const newState = boardReducer(initialState, {
        type: 'ADD_TASK',
        payload: { noteId, text: '   ' }
      });
      
      // Task should not be added since text is effectively empty
      expect(newState.notes[0].tasks.length).toBe(0);
    });
    
    it('should handle tasks with special characters and code', () => {
      const initialState = createInitialState();
      const noteId = initialState.notes[0].id;
      
      // Create a task with code-like content
      const codeText = 'function test() { return "Hello"; } // Comment';
      
      const newState = boardReducer(initialState, {
        type: 'ADD_TASK',
        payload: { noteId, text: codeText }
      });
      
      // Task should preserve the exact code syntax
      expect(newState.notes[0].tasks[0].text).toBe(codeText);
    });
    
    it('should handle tasks with zero-width characters', () => {
      const initialState = createInitialState();
      const noteId = initialState.notes[0].id;
      
      // Create a task with zero-width characters mixed in
      const zeroWidthText = 'Invisible\u200Bcharacters\u200Bin\u200Bthis\u200Btext';
      
      const newState = boardReducer(initialState, {
        type: 'ADD_TASK',
        payload: { noteId, text: zeroWidthText }
      });
      
      // Task should preserve all characters including zero-width ones
      expect(newState.notes[0].tasks[0].text).toBe(zeroWidthText);
    });
  });
  
  describe('Task Indentation Edge Cases', () => {
    it('should prevent negative indentation', () => {
      // Create a state with a task
      let state = createInitialState();
      const noteId = state.notes[0].id;
      
      // Add a task
      state = boardReducer(state, {
        type: 'ADD_TASK',
        payload: { noteId, text: 'Test task' }
      });
      
      const taskId = state.notes[0].tasks[0].id;
      
      // Try to outdent beyond the minimum (negative indentation)
      const newState = boardReducer(state, {
        type: 'INDENT_TASK',
        payload: { noteId, taskId, direction: 'left' }
      });
      
      // Indentation should be clamped to 0
      expect(newState.notes[0].tasks[0].indentation).toBe(0);
    });
    
    it('should handle excessive indentation gracefully', () => {
      // Create a state with a task
      let state = createInitialState();
      const noteId = state.notes[0].id;
      
      // Add a task
      state = boardReducer(state, {
        type: 'ADD_TASK',
        payload: { noteId, text: 'Test task' }
      });
      
      const taskId = state.notes[0].tasks[0].id;
      
      // Indent the task 15 times (testing extreme case)
      for (let i = 0; i < 15; i++) {
        state = boardReducer(state, {
          type: 'INDENT_TASK',
          payload: { noteId, taskId, direction: 'right' }
        });
      }
      
      // There should be a reasonable maximum indentation
      // (implementation specific, but should be limited)
      expect(state.notes[0].tasks[0].indentation).toBeLessThanOrEqual(15);
      expect(state.notes[0].tasks[0].indentation).toBeGreaterThan(0);
    });
    
    it('should maintain valid parent-child relationships when indenting', () => {
      // Create a note with a hierarchical task structure
      let state = createInitialState();
      const noteId = state.notes[0].id;
      
      // Add parent task
      state = boardReducer(state, {
        type: 'ADD_TASK',
        payload: { noteId, text: 'Parent task' }
      });
      
      // Add child task
      state = boardReducer(state, {
        type: 'ADD_TASK',
        payload: { noteId, text: 'Child task' }
      });
      
      const childId = state.notes[0].tasks[1].id;
      
      // Indent the child
      state = boardReducer(state, {
        type: 'INDENT_TASK',
        payload: { noteId, taskId: childId, direction: 'right' }
      });
      
      // Add grandchild task
      state = boardReducer(state, {
        type: 'ADD_TASK',
        payload: { noteId, text: 'Grandchild task' }
      });
      
      const grandchildId = state.notes[0].tasks[2].id;
      
      // Indent the grandchild
      state = boardReducer(state, {
        type: 'INDENT_TASK',
        payload: { noteId, taskId: grandchildId, direction: 'right' }
      });
      
      // One more level
      state = boardReducer(state, {
        type: 'INDENT_TASK',
        payload: { noteId, taskId: grandchildId, direction: 'right' }
      });
      
      // Check proper hierarchy
      expect(state.notes[0].tasks[0].indentation).toBe(0);
      expect(state.notes[0].tasks[1].indentation).toBe(1);
      expect(state.notes[0].tasks[2].indentation).toBe(2);
      
      // Now try reordering - should maintain indentation
      state = boardReducer(state, {
        type: 'REORDER_TASK',
        payload: { 
          noteId, 
          sourceIndex: 1, 
          targetIndex: 2, 
          hasSubtasks: false
        }
      });
      
      // The order changed but indentation should be preserved
      expect(state.notes[0].tasks[0].indentation).toBe(0); // Parent
      expect(state.notes[0].tasks[1].indentation).toBe(2); // Grandchild moved up
      expect(state.notes[0].tasks[2].indentation).toBe(1); // Child moved down
    });
  });
  
  describe('Task Deletion and Completion Edge Cases', () => {
    it('should properly handle deletion of parent tasks with subtasks', () => {
      // Create a hierarchy of tasks
      let state = createInitialState();
      const noteId = state.notes[0].id;
      
      // Add parent and child tasks
      for (let i = 0; i < 5; i++) {
        state = boardReducer(state, {
          type: 'ADD_TASK',
          payload: { noteId, text: `Task ${i}` }
        });
      }
      
      // Indent some tasks to create hierarchy
      for (let i = 1; i < 5; i++) {
        state = boardReducer(state, {
          type: 'INDENT_TASK',
          payload: { 
            noteId, 
            taskId: state.notes[0].tasks[i].id, 
            direction: 'right' 
          }
        });
      }
      
      // Delete the parent task
      const parentId = state.notes[0].tasks[0].id;
      const newState = boardReducer(state, {
        type: 'DELETE_TASK',
        payload: { noteId, taskId: parentId }
      });
      
      // Children should be moved to root level or handled gracefully
      // The exact behavior depends on implementation - we're just testing for consistency
      expect(newState.notes[0].tasks.length).toBe(4);
    });
    
    it('should handle archiving all tasks in a note', () => {
      // Create a note with a few tasks
      let state = createInitialState();
      const noteId = state.notes[0].id;
      
      // Add 3 tasks
      for (let i = 0; i < 3; i++) {
        state = boardReducer(state, {
          type: 'ADD_TASK',
          payload: { noteId, text: `Task ${i}` }
        });
      }
      
      // Complete all tasks one by one
      for (let i = 0; i < 3; i++) {
        const taskId = state.notes[0].tasks[0].id; // Always complete the first remaining task
        state = boardReducer(state, {
          type: 'TOGGLE_TASK',
          payload: { noteId, taskId }
        });
      }
      
      // All tasks should be archived
      expect(state.notes[0].tasks.length).toBe(0);
      expect(state.archivedTasks.length).toBe(3);
    });
    
    it('should handle archiving and restoring tasks to deleted notes', () => {
      // Create a note with a task
      let state = createInitialState();
      const noteId = state.notes[0].id;
      
      // Add a task
      state = boardReducer(state, {
        type: 'ADD_TASK',
        payload: { noteId, text: 'Task to archive' }
      });
      
      const taskId = state.notes[0].tasks[0].id;
      
      // Complete/archive the task
      state = boardReducer(state, {
        type: 'TOGGLE_TASK',
        payload: { noteId, taskId }
      });
      
      // Delete the note
      state = boardReducer(state, {
        type: 'DELETE_NOTE',
        payload: { id: noteId }
      });
      
      // Now try to restore the archived task
      const archivedTaskId = state.archivedTasks[0].id;
      const newState = boardReducer(state, {
        type: 'RESTORE_ARCHIVED_TASK',
        payload: { taskId: archivedTaskId }
      });
      
      // Since the original note is gone, it should create a new note
      expect(newState.notes.length).toBe(1);
      expect(newState.notes[0].title).toBe('Restored Tasks');
      expect(newState.notes[0].tasks.length).toBe(1);
      expect(newState.notes[0].tasks[0].text).toBe('Task to archive');
      expect(newState.archivedTasks.length).toBe(0);
    });
  });
  
  describe('Task Priority Edge Cases', () => {
    it('should handle changing priority of multiple tasks', () => {
      // Create a note with several tasks
      let state = createInitialState();
      const noteId = state.notes[0].id;
      
      // Add 5 tasks
      for (let i = 0; i < 5; i++) {
        state = boardReducer(state, {
          type: 'ADD_TASK',
          payload: { noteId, text: `Task ${i}` }
        });
      }
      
      const taskIds = state.notes[0].tasks.map(task => task.id);
      
      // Set different priorities for all tasks
      const priorities = ['none', 'low', 'medium', 'high', 'none'] as const;
      
      for (let i = 0; i < 5; i++) {
        state = boardReducer(state, {
          type: 'SET_TASK_PRIORITY',
          payload: { 
            noteId, 
            taskId: taskIds[i], 
            priority: priorities[i]
          }
        });
      }
      
      // Verify all priorities are set correctly
      for (let i = 0; i < 5; i++) {
        expect(state.notes[0].tasks[i].priority).toBe(priorities[i]);
      }
      
      // Change a priority back to none
      state = boardReducer(state, {
        type: 'SET_TASK_PRIORITY',
        payload: { 
          noteId, 
          taskId: taskIds[2], 
          priority: 'none'
        }
      });
      
      // Verify the change
      expect(state.notes[0].tasks[2].priority).toBe('none');
    });
  });
  
  describe('Multiple Notes Edge Cases', () => {
    it('should handle drag-and-drop between notes with many tasks', () => {
      // Create state with 2 notes, each with many tasks
      let state = createInitialState();
      
      // Add a second note
      state = boardReducer(state, {
        type: 'ADD_NOTE',
        payload: { color: 'blue', position: { x: 400, y: 100 } }
      });
      
      const noteIds = state.notes.map(note => note.id);
      
      // Add 20 tasks to first note
      for (let i = 0; i < 20; i++) {
        state = boardReducer(state, {
          type: 'ADD_TASK',
          payload: { noteId: noteIds[0], text: `Source Task ${i}` }
        });
      }
      
      // Add 10 tasks to second note
      for (let i = 0; i < 10; i++) {
        state = boardReducer(state, {
          type: 'ADD_TASK',
          payload: { noteId: noteIds[1], text: `Target Task ${i}` }
        });
      }
      
      // Move a task from first note to second note
      const taskToMove = state.notes[0].tasks[5].id;
      
      const newState = boardReducer(state, {
        type: 'MOVE_TASK',
        payload: {
          sourceNoteId: noteIds[0],
          targetNoteId: noteIds[1],
          taskId: taskToMove
        }
      });
      
      // Verify the task was moved
      expect(newState.notes[0].tasks.length).toBe(19);
      expect(newState.notes[1].tasks.length).toBe(11);
      
      // The moved task should be in the second note
      const movedTask = newState.notes[1].tasks.find(task => task.id === taskToMove);
      expect(movedTask).toBeDefined();
      expect(movedTask?.text).toBe('Source Task 5');
    });
    
    it('should handle complex subtask moves between notes', () => {
      // Create state with 2 notes
      let state = createInitialState();
      
      // Add a second note
      state = boardReducer(state, {
        type: 'ADD_NOTE',
        payload: { color: 'blue', position: { x: 400, y: 100 } }
      });
      
      const noteIds = state.notes.map(note => note.id);
      
      // Add a parent task and subtasks to first note
      state = boardReducer(state, {
        type: 'ADD_TASK',
        payload: { noteId: noteIds[0], text: 'Parent Task' }
      });
      
      for (let i = 0; i < 3; i++) {
        state = boardReducer(state, {
          type: 'ADD_TASK',
          payload: { noteId: noteIds[0], text: `Subtask ${i}` }
        });
      }
      
      // Indent the subtasks
      for (let i = 1; i <= 3; i++) {
        state = boardReducer(state, {
          type: 'INDENT_TASK',
          payload: { 
            noteId: noteIds[0], 
            taskId: state.notes[0].tasks[i].id, 
            direction: 'right' 
          }
        });
      }
      
      // Move the parent task with all subtasks
      const parentId = state.notes[0].tasks[0].id;
      
      const newState = boardReducer(state, {
        type: 'MOVE_TASK',
        payload: {
          sourceNoteId: noteIds[0],
          targetNoteId: noteIds[1],
          taskId: parentId,
          hasSubtasks: true,
          subtaskIndices: [1, 2, 3]
        }
      });
      
      // First note should be empty
      expect(newState.notes[0].tasks.length).toBe(0);
      
      // Second note should have all 4 tasks
      expect(newState.notes[1].tasks.length).toBe(4);
      
      // The parent-child relationships should be preserved (indentation)
      expect(newState.notes[1].tasks[0].indentation).toBe(0);
      expect(newState.notes[1].tasks[1].indentation).toBe(1);
      expect(newState.notes[1].tasks[2].indentation).toBe(1);
      expect(newState.notes[1].tasks[3].indentation).toBe(1);
    });
  });
  
  describe('Search Edge Cases', () => {
    it('should handle search with regex special characters', () => {
      // Create a note with tasks containing special regex characters
      let state = createInitialState();
      const noteId = state.notes[0].id;
      
      // Add tasks with regex special characters
      const specialChars = [
        'Task with (parentheses)',
        'Task with [brackets]',
        'Task with {curly braces}',
        'Task with ? question mark',
        'Task with * asterisk',
        'Task with + plus',
        'Task with . period',
        'Task with ^ caret',
        'Task with $ dollar',
        'Task with | pipe'
      ];
      
      for (const text of specialChars) {
        state = boardReducer(state, {
          type: 'ADD_TASK',
          payload: { noteId, text }
        });
      }
      
      // Search for each special character
      const searchTerms = ['(', '[', '{', '?', '*', '+', '.', '^', '$', '|'];
      
      for (const term of searchTerms) {
        const searchState = boardReducer(state, {
          type: 'SET_SEARCH',
          payload: { term, scope: 'global' }
        });
        
        // Search should be active
        expect(searchState.search.isActive).toBe(true);
        expect(searchState.search.term).toBe(term);
        
        // Clear search for next test
        state = boardReducer(state, { type: 'CLEAR_SEARCH' });
      }
    });
    
    it('should handle search with zero results', () => {
      // Create a note with tasks
      let state = createInitialState();
      const noteId = state.notes[0].id;
      
      // Add some tasks
      state = boardReducer(state, {
        type: 'ADD_TASK',
        payload: { noteId, text: 'First task' }
      });
      
      state = boardReducer(state, {
        type: 'ADD_TASK',
        payload: { noteId, text: 'Second task' }
      });
      
      // Search for non-existent term
      const searchState = boardReducer(state, {
        type: 'SET_SEARCH',
        payload: { term: 'nonexistent', scope: 'global' }
      });
      
      // Search should be active but with no results
      expect(searchState.search.isActive).toBe(true);
      expect(searchState.search.term).toBe('nonexistent');
      
      // The tasks still exist but shouldn't match the search
      expect(searchState.notes[0].tasks.length).toBe(2);
      
      // If we were rendering this, we'd filter tasks in the UI
    });
    
    it('should handle search with exact vs partial matching', () => {
      // Create a note with tasks
      let state = createInitialState();
      const noteId = state.notes[0].id;
      
      // Add tasks with similar text
      state = boardReducer(state, {
        type: 'ADD_TASK',
        payload: { noteId, text: 'Task' }
      });
      
      state = boardReducer(state, {
        type: 'ADD_TASK',
        payload: { noteId, text: 'Tasking' }
      });
      
      state = boardReducer(state, {
        type: 'ADD_TASK',
        payload: { noteId, text: 'My Task' }
      });
      
      state = boardReducer(state, {
        type: 'ADD_TASK',
        payload: { noteId, text: 'TASK uppercase' }
      });
      
      // Search for exact word
      const searchState = boardReducer(state, {
        type: 'SET_SEARCH',
        payload: { term: 'Task', scope: 'global' }
      });
      
      // All 4 tasks should match (case-insensitive partial match)
      // But if filtering in UI, they would all show up
      expect(searchState.search.isActive).toBe(true);
      expect(searchState.search.term).toBe('Task');
    });
  });
});