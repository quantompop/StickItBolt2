import { describe, it, expect, vi, beforeEach } from 'vitest';
import { boardReducer } from '../context/BoardContext';
import { BoardState, Task, Note } from '../types';

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

describe('Edge Cases', () => {
  describe('Maximum/Minimum Input Values', () => {
    it('should handle extremely long note titles', () => {
      // Create a state with a note first
      let state = createInitialState();
      state = boardReducer(state, {
        type: 'ADD_NOTE',
        payload: { color: 'yellow', position: { x: 100, y: 100 } }
      });
      
      const noteId = state.notes[1].id;
      const longTitle = 'a'.repeat(1000); // 1000 character title
      
      // Update the note with the long title
      const newState = boardReducer(state, {
        type: 'UPDATE_NOTE',
        payload: { id: noteId, title: longTitle }
      });
      
      expect(newState.notes[1].title).toBe(longTitle);
    });
    
    it('should handle extremely long task text', () => {
      // Create initial state with a note
      let state = createInitialState();
      state = boardReducer(state, {
        type: 'ADD_NOTE',
        payload: { color: 'yellow', position: { x: 100, y: 100 } }
      });
      
      const noteId = state.notes[0].id;
      const longText = 'a'.repeat(5000); // 5000 character task
      
      // Add a task with extremely long text
      const newState = boardReducer(state, {
        type: 'ADD_TASK',
        payload: { noteId, text: longText }
      });
      
      expect(newState.notes[0].tasks[0].text).toBe(longText);
    });
    
    it('should handle maximum allowed task indentation', () => {
      // Create a note with a task
      let state = createInitialState();
      state = boardReducer(state, {
        type: 'ADD_NOTE',
        payload: { color: 'yellow', position: { x: 100, y: 100 } }
      });
      
      const noteId = state.notes[0].id;
      
      // Add a task
      state = boardReducer(state, {
        type: 'ADD_TASK',
        payload: { noteId, text: 'Test task' }
      });
      
      const taskId = state.notes[0].tasks[0].id;
      
      // Indent the task 20 times (testing a reasonable maximum)
      let newState = state;
      for (let i = 0; i < 20; i++) {
        newState = boardReducer(newState, {
          type: 'INDENT_TASK',
          payload: { noteId, taskId, direction: 'right' }
        });
      }
      
      expect(newState.notes[0].tasks[0].indentation).toBeLessThanOrEqual(20);
      expect(newState.notes[0].tasks[0].indentation).toBeGreaterThan(0);
    });
    
    it('should handle minimum text size without breaking UI', () => {
      // Create a note
      let state = createInitialState();
      state = boardReducer(state, {
        type: 'ADD_NOTE',
        payload: { color: 'yellow', position: { x: 100, y: 100 } }
      });
      
      const noteId = state.notes[0].id;
      
      // Set extremely small text size
      const newState = boardReducer(state, {
        type: 'CHANGE_TEXT_SIZE',
        payload: { id: noteId, size: 1 }
      });
      
      // Text size should be clamped to a minimum value or handled gracefully
      expect(newState.notes[0].textSize).toBeGreaterThanOrEqual(1);
    });
  });
  
  describe('Empty/Null Inputs', () => {
    it('should handle empty note title gracefully', () => {
      const initialState = createInitialState();
      
      // Add a note
      let state = boardReducer(initialState, {
        type: 'ADD_NOTE',
        payload: { color: 'yellow', position: { x: 100, y: 100 } }
      });
      
      const noteId = state.notes[0].id;
      
      // Update with empty title
      const newState = boardReducer(state, {
        type: 'UPDATE_NOTE',
        payload: { id: noteId, title: '' }
      });
      
      // Should set a default title like "Untitled Note"
      expect(newState.notes[0].title).toBeTruthy();
    });
    
    it('should handle empty task text gracefully', () => {
      // Create a note
      let state = createInitialState();
      state = boardReducer(state, {
        type: 'ADD_NOTE',
        payload: { color: 'yellow', position: { x: 100, y: 100 } }
      });
      
      const noteId = state.notes[0].id;
      
      // Try to add a task with empty text
      const newState = boardReducer(state, {
        type: 'ADD_TASK',
        payload: { noteId, text: '' }
      });
      
      // Empty tasks should not be added
      expect(newState.notes[0].tasks.length).toBe(0);
    });
    
    it('should handle null or undefined note position', () => {
      const initialState = createInitialState();
      
      // Add a note with undefined position
      const newState = boardReducer(initialState, {
        type: 'ADD_NOTE',
        payload: { color: 'yellow', position: undefined }
      });
      
      // Should use default position
      expect(newState.notes[1].position).toBeDefined();
      expect(newState.notes[1].position.x).toBeGreaterThan(0);
      expect(newState.notes[1].position.y).toBeGreaterThan(0);
    });
  });
  
  describe('Boundary Conditions', () => {
    it('should handle maximum number of notes', () => {
      let state = createInitialState();
      
      // Create 50 notes (testing a reasonable maximum)
      for (let i = 0; i < 50; i++) {
        state = boardReducer(state, {
          type: 'ADD_NOTE',
          payload: { 
            color: 'yellow', 
            position: { x: i * 10, y: i * 10 } 
          }
        });
      }
      
      // Should handle large number of notes without breaking
      expect(state.notes.length).toBe(51); // 50 + 1 from initialState
    });
    
    it('should handle maximum number of tasks in a note', () => {
      let state = createInitialState();
      
      // Add a note
      state = boardReducer(state, {
        type: 'ADD_NOTE',
        payload: { color: 'yellow', position: { x: 100, y: 100 } }
      });
      
      const noteId = state.notes[0].id;
      
      // Add 50 tasks (testing a reasonable maximum)
      for (let i = 0; i < 50; i++) {
        state = boardReducer(state, {
          type: 'ADD_TASK',
          payload: { noteId, text: `Task ${i}` }
        });
      }
      
      // Should handle large number of tasks without breaking
      expect(state.notes[0].tasks.length).toBe(50);
    });
    
    it('should handle maximum note area size (width/height)', () => {
      const initialState = createInitialState();
      
      // Create a note at extreme coordinates
      const newState = boardReducer(initialState, {
        type: 'ADD_NOTE',
        payload: { 
          color: 'yellow', 
          position: { x: 9999999, y: 9999999 } 
        }
      });
      
      // Note should be created at the specified position
      expect(newState.notes[1].position.x).toBe(9999999);
      expect(newState.notes[1].position.y).toBe(9999999);
    });
    
    it('should handle negative note coordinates', () => {
      const initialState = createInitialState();
      
      // Create a note at negative coordinates
      const newState = boardReducer(initialState, {
        type: 'ADD_NOTE',
        payload: { 
          color: 'yellow', 
          position: { x: -500, y: -500 } 
        }
      });
      
      // Note should be created at the specified position
      expect(newState.notes[1].position.x).toBe(-500);
      expect(newState.notes[1].position.y).toBe(-500);
    });
  });
  
  describe('Special Characters and Unicode', () => {
    it('should handle note titles with special characters', () => {
      const initialState = createInitialState();
      const specialTitle = '!@#$%^&*()_+{}[]|":;<>,.?/~`\\';
      
      // Add a note with special characters in title
      let state = boardReducer(initialState, {
        type: 'ADD_NOTE',
        payload: { 
          color: 'yellow', 
          position: { x: 100, y: 100 } 
        }
      });
      
      const noteId = state.notes[0].id;
      
      // Update title with special characters
      state = boardReducer(state, {
        type: 'UPDATE_NOTE',
        payload: { id: noteId, title: specialTitle }
      });
      
      expect(state.notes[0].title).toBe(specialTitle);
    });
    
    it('should handle task text with emojis and unicode characters', () => {
      // Create a note
      let state = createInitialState();
      state = boardReducer(state, {
        type: 'ADD_NOTE',
        payload: { color: 'yellow', position: { x: 100, y: 100 } }
      });
      
      const noteId = state.notes[0].id;
      const unicodeText = '😀 こんにちは 안녕하세요 你好 ñáéíóú';
      
      // Add a task with unicode characters
      state = boardReducer(state, {
        type: 'ADD_TASK',
        payload: { noteId, text: unicodeText }
      });
      
      expect(state.notes[0].tasks[0].text).toBe(unicodeText);
    });
    
    it('should handle HTML tags in task text without rendering them', () => {
      // Create a note
      let state = createInitialState();
      state = boardReducer(state, {
        type: 'ADD_NOTE',
        payload: { color: 'yellow', position: { x: 100, y: 100 } }
      });
      
      const noteId = state.notes[0].id;
      const htmlText = '<script>alert("XSS")</script><b>Bold Text</b>';
      
      // Add a task with HTML content
      state = boardReducer(state, {
        type: 'ADD_TASK',
        payload: { noteId, text: htmlText }
      });
      
      // The text should be stored as-is, not interpreted as HTML
      expect(state.notes[0].tasks[0].text).toBe(htmlText);
    });
  });
  
  describe('Extremely Large Datasets', () => {
    it('should handle a large number of archived tasks', () => {
      // Create initial state with many archived tasks
      const initialState = createInitialState();
      const archivedTasks = Array.from({ length: 100 }, (_, i) => ({
        id: `archived-${i}`,
        text: `Archived Task ${i}`,
        noteId: 'note-1',
        noteTitle: 'Test Note',
        completedAt: Date.now() - i * 1000
      }));
      
      const state = {
        ...initialState,
        archivedTasks
      };
      
      // Test that operations still work with many archived tasks
      const newState = boardReducer(state, {
        type: 'ADD_NOTE',
        payload: { color: 'yellow', position: { x: 100, y: 100 } }
      });
      
      expect(newState.notes.length).toBe(2);
      expect(newState.archivedTasks.length).toBe(100);
    });
    
    it('should handle large version history', () => {
      // Create initial state with large version history
      const initialState = createInitialState();
      const versionHistory = Array.from({ length: 30 }, (_, i) => ({
        timestamp: Date.now() - i * 60000,
        data: {
          notes: [],
          archivedTasks: []
        } as BoardState,
        description: `Version ${i}`
      }));
      
      const state = {
        ...initialState,
        versionHistory
      };
      
      // Test that operations still work with large version history
      const newState = boardReducer(state, {
        type: 'ADD_NOTE',
        payload: { color: 'yellow', position: { x: 100, y: 100 } }
      });
      
      expect(newState.notes.length).toBe(2);
      // Version history should be capped at a maximum size
      expect(newState.versionHistory.length).toBeLessThanOrEqual(51); // MAX_VERSION_HISTORY + 1
    });
  });
});