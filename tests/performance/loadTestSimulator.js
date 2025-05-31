/**
 * Load Test Simulator for StickIt App
 * 
 * This script simulates high load scenarios to test application performance.
 * Run this after the application is loaded to stress test various features.
 * 
 * Usage: 
 * - Open the StickIt app in a browser
 * - Open the browser console
 * - Copy and paste this script to execute the load tests
 * - Check console for performance metrics
 */

class StickItLoadTester {
  constructor() {
    this.results = {
      noteCreation: [],
      taskCreation: [],
      stateModification: [],
      search: [],
      rendering: []
    };
    this.notes = [];
  }
  
  /**
   * Simulate creating many notes at once
   */
  async testNoteCreation(count = 50) {
    console.log(`🔍 Testing creation of ${count} notes...`);
    
    // Access the BoardContext dispatch function
    const boardContextValue = this.getBoardContext();
    if (!boardContextValue) return false;
    
    const { dispatch } = boardContextValue;
    
    const startTime = performance.now();
    
    // Create notes in batches to avoid UI freezing
    const batchSize = 10;
    const batches = Math.ceil(count / batchSize);
    
    for (let batch = 0; batch < batches; batch++) {
      const batchStart = batch * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, count);
      
      console.log(`Creating notes ${batchStart+1} to ${batchEnd}...`);
      
      for (let i = batchStart; i < batchEnd; i++) {
        const noteId = `load-test-note-${i}`;
        
        dispatch({
          type: 'ADD_NOTE',
          payload: {
            id: noteId,
            color: ['yellow', 'blue', 'green', 'pink', 'purple', 'orange'][i % 6],
            position: {
              x: 100 + (i % 10) * 50,
              y: 100 + Math.floor(i / 10) * 50
            }
          }
        });
        
        this.notes.push(noteId);
      }
      
      // Allow UI to update between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    const avgTimePerNote = duration / count;
    
    this.results.noteCreation.push({
      count,
      totalDuration: duration,
      avgTimePerNote
    });
    
    console.log(`✅ Created ${count} notes in ${duration.toFixed(2)}ms (${avgTimePerNote.toFixed(2)}ms per note)`);
    return true;
  }
  
  /**
   * Test adding many tasks to notes
   */
  async testTaskCreation(tasksPerNote = 20) {
    if (this.notes.length === 0) {
      console.log('❌ No notes available for task creation test');
      return false;
    }
    
    console.log(`🔍 Testing creation of ${tasksPerNote} tasks per note (${this.notes.length * tasksPerNote} total tasks)...`);
    
    const boardContextValue = this.getBoardContext();
    if (!boardContextValue) return false;
    
    const { dispatch, state } = boardContextValue;
    
    const startTime = performance.now();
    
    // Get actual note IDs from state
    const realNotes = state.notes.map(note => note.id);
    
    // Create tasks for each note in batches
    for (let noteIndex = 0; noteIndex < realNotes.length; noteIndex++) {
      const noteId = realNotes[noteIndex];
      
      for (let i = 0; i < tasksPerNote; i++) {
        dispatch({
          type: 'ADD_TASK',
          payload: {
            noteId,
            text: `Performance test task ${i} for note ${noteIndex}`
          }
        });
      }
      
      // Allow UI to update between notes
      if (noteIndex % 5 === 4) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    const avgTimePerTask = duration / (realNotes.length * tasksPerNote);
    
    this.results.taskCreation.push({
      totalTasks: realNotes.length * tasksPerNote,
      totalDuration: duration,
      avgTimePerTask
    });
    
    console.log(`✅ Created ${realNotes.length * tasksPerNote} tasks in ${duration.toFixed(2)}ms (${avgTimePerTask.toFixed(2)}ms per task)`);
    return true;
  }
  
  /**
   * Test search performance with large dataset
   */
  async testSearch() {
    const boardContextValue = this.getBoardContext();
    if (!boardContextValue) return false;
    
    const { dispatch, state } = boardContextValue;
    
    if (state.notes.length === 0) {
      console.log('❌ No notes available for search test');
      return false;
    }
    
    console.log(`🔍 Testing search performance with ${state.notes.length} notes...`);
    
    // Search terms to test
    const searchTerms = [
      'task', 
      'note', 
      'performance',
      'nonexistent term', 
      'test'
    ];
    
    for (const term of searchTerms) {
      const startTime = performance.now();
      
      dispatch({
        type: 'SET_SEARCH',
        payload: {
          term,
          scope: 'global'
        }
      });
      
      // Measure how long the search operation takes
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.results.search.push({
        term,
        notesCount: state.notes.length,
        tasksCount: state.notes.reduce((sum, note) => sum + note.tasks.length, 0),
        duration
      });
      
      console.log(`Search for "${term}" took ${duration.toFixed(2)}ms`);
      
      // Clear search before next one
      await new Promise(resolve => setTimeout(resolve, 500));
      dispatch({ type: 'CLEAR_SEARCH' });
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`✅ Completed search performance tests`);
    return true;
  }
  
  /**
   * Test rapid state modifications
   */
  async testRapidStateModifications() {
    const boardContextValue = this.getBoardContext();
    if (!boardContextValue) return false;
    
    const { dispatch, state } = boardContextValue;
    
    if (state.notes.length === 0) {
      console.log('❌ No notes available for state modification test');
      return false;
    }
    
    console.log(`🔍 Testing rapid state modifications...`);
    
    const startTime = performance.now();
    const operationsCount = 100;
    
    // Perform a series of rapid operations
    for (let i = 0; i < operationsCount; i++) {
      const operation = i % 5;
      
      switch (operation) {
        case 0: // Add a task
          if (state.notes.length > 0) {
            const randomNoteIndex = Math.floor(Math.random() * state.notes.length);
            dispatch({
              type: 'ADD_TASK',
              payload: {
                noteId: state.notes[randomNoteIndex].id,
                text: `Rapid task ${i}`
              }
            });
          }
          break;
          
        case 1: // Change note color
          if (state.notes.length > 0) {
            const randomNoteIndex = Math.floor(Math.random() * state.notes.length);
            const colors = ['yellow', 'blue', 'green', 'pink', 'purple', 'orange'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            
            dispatch({
              type: 'CHANGE_NOTE_COLOR',
              payload: {
                id: state.notes[randomNoteIndex].id,
                color: randomColor
              }
            });
          }
          break;
          
        case 2: // Move a note
          if (state.notes.length > 0) {
            const randomNoteIndex = Math.floor(Math.random() * state.notes.length);
            dispatch({
              type: 'MOVE_NOTE',
              payload: {
                id: state.notes[randomNoteIndex].id,
                position: {
                  x: Math.floor(Math.random() * 800),
                  y: Math.floor(Math.random() * 600)
                }
              }
            });
          }
          break;
          
        case 3: // Toggle a task if available
          if (state.notes.length > 0) {
            const notesWithTasks = state.notes.filter(note => note.tasks.length > 0);
            if (notesWithTasks.length > 0) {
              const randomNoteIndex = Math.floor(Math.random() * notesWithTasks.length);
              const note = notesWithTasks[randomNoteIndex];
              const randomTaskIndex = Math.floor(Math.random() * note.tasks.length);
              
              dispatch({
                type: 'TOGGLE_TASK',
                payload: {
                  noteId: note.id,
                  taskId: note.tasks[randomTaskIndex].id
                }
              });
            }
          }
          break;
          
        case 4: // Add a note
          dispatch({
            type: 'ADD_NOTE',
            payload: {
              color: ['yellow', 'blue', 'green', 'pink', 'purple', 'orange'][i % 6],
              position: {
                x: 100 + (i % 10) * 50,
                y: 100 + Math.floor(i / 10) * 50
              }
            }
          });
          break;
      }
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    this.results.stateModification.push({
      operationsCount,
      totalDuration: duration,
      avgTimePerOperation: duration / operationsCount
    });
    
    console.log(`✅ Performed ${operationsCount} rapid state modifications in ${duration.toFixed(2)}ms (${(duration / operationsCount).toFixed(2)}ms per operation)`);
    return true;
  }
  
  /**
   * Test rendering performance of the application
   */
  async testRenderingPerformance() {
    console.log(`🔍 Testing rendering performance...`);
    
    // Use Performance API to measure rendering metrics
    if (!window.performance || !window.performance.mark) {
      console.log('❌ Performance API not available');
      return false;
    }
    
    // Measure initial render time
    window.performance.mark('render-start');
    
    // Force a re-render of the board component
    const boardContextValue = this.getBoardContext();
    if (!boardContextValue) return false;
    
    const { dispatch } = boardContextValue;
    
    // Toggle search to force re-render
    dispatch({
      type: 'SET_SEARCH',
      payload: { term: 'performance', scope: 'global' }
    });
    
    // Wait for render to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mark end of render
    window.performance.mark('render-end');
    window.performance.measure('render-time', 'render-start', 'render-end');
    
    const measures = window.performance.getEntriesByName('render-time', 'measure');
    if (measures.length > 0) {
      const renderTime = measures[0].duration;
      
      this.results.rendering.push({
        operation: 'global-search',
        duration: renderTime
      });
      
      console.log(`✅ Render time for global search: ${renderTime.toFixed(2)}ms`);
    }
    
    // Clear the search
    dispatch({ type: 'CLEAR_SEARCH' });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Clear performance marks and measures
    window.performance.clearMarks();
    window.performance.clearMeasures();
    
    return true;
  }
  
  /**
   * Get access to the Board context
   */
  getBoardContext() {
    // Find the React instance
    let boardContext = null;
    
    // This is a hack to access React context - in a real app you'd use proper testing tools
    // Attempt to find the BoardContext in the React fiber
    const findContext = (node) => {
      if (!node) return null;
      
      // Check if this node might have our context
      if (node.memoizedProps && 
          node.memoizedProps.value && 
          node.memoizedProps.value.state && 
          node.memoizedProps.value.state.notes !== undefined) {
        return node.memoizedProps.value;
      }
      
      // Search children recursively
      if (node.child) {
        const result = findContext(node.child);
        if (result) return result;
      }
      
      // Search siblings
      if (node.sibling) {
        const result = findContext(node.sibling);
        if (result) return result;
      }
      
      return null;
    };
    
    // Find the React root
    const roots = Array.from(document.querySelectorAll('[id^="root"]'));
    for (const root of roots) {
      const fiberKey = Object.keys(root).find(key => key.startsWith('__reactFiber$'));
      if (fiberKey) {
        const fiber = root[fiberKey];
        boardContext = findContext(fiber);
        if (boardContext) break;
      }
    }
    
    if (!boardContext) {
      console.log('❌ Could not access BoardContext. Run this script in the StickIt app.');
      return null;
    }
    
    return boardContext;
  }
  
  /**
   * Run all performance tests
   */
  async runAllTests() {
    console.log('🚀 Starting StickIt performance tests...');
    
    console.log('\n📊 INITIAL STATE:');
    const initialContext = this.getBoardContext();
    if (initialContext) {
      console.log(`- Notes: ${initialContext.state.notes.length}`);
      console.log(`- Archived tasks: ${initialContext.state.archivedTasks.length}`);
      console.log(`- Version history: ${initialContext.state.versionHistory.length}`);
    }
    
    await this.testNoteCreation(30);
    await this.testTaskCreation(15);
    await this.testSearch();
    await this.testRapidStateModifications();
    await this.testRenderingPerformance();
    
    console.log('\n📊 PERFORMANCE TEST RESULTS:');
    console.log(JSON.stringify(this.results, null, 2));
    
    console.log('\n✅ All performance tests completed');
  }
}

// Create and run the tester
const tester = new StickItLoadTester();
tester.runAllTests();