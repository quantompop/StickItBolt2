import React from 'react';
import { mount } from 'cypress/react';
import Board from '../../src/components/Board';
import { BoardProvider } from '../../src/context/BoardContext';
import { AuthProvider } from '../../src/context/AuthContext';
import { BoardState, Note, Task } from '../../src/types';

// Generate test data
const generateTestData = (noteCount: number, tasksPerNote: number): BoardState => {
  const notes: Note[] = [];
  
  for (let i = 0; i < noteCount; i++) {
    const tasks: Task[] = [];
    
    for (let j = 0; j < tasksPerNote; j++) {
      tasks.push({
        id: `task-${i}-${j}`,
        text: `Task ${j} of Note ${i}`,
        completed: j % 3 === 0,
        indentation: Math.min(j % 3, 2),
        priority: j % 4 === 0 ? 'high' : j % 3 === 0 ? 'medium' : j % 2 === 0 ? 'low' : 'none'
      });
    }
    
    notes.push({
      id: `note-${i}`,
      title: `Note ${i}`,
      color: ['yellow', 'blue', 'green', 'pink', 'purple', 'orange'][i % 6],
      position: { x: 100 + (i % 3) * 300, y: 100 + Math.floor(i / 3) * 350 },
      tasks,
      textSize: 14,
      taskSpacing: 8
    });
  }
  
  return {
    boardId: 'stress-test-board',
    notes,
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
  };
};

describe('Board Component Stress Tests', () => {
  it('should handle moderate load (10 notes, 5 tasks each)', () => {
    // Mock the context to provide test data
    cy.stub(window, 'BoardState').as('boardState');
    cy.stub(window, 'useBoard').returns({
      state: generateTestData(10, 5),
      dispatch: cy.stub()
    });
    
    // Mount the component
    mount(
      <AuthProvider>
        <BoardProvider>
          <Board />
        </BoardProvider>
      </AuthProvider>
    );
    
    // Verify rendering completed
    cy.get('.note-header').should('have.length', 10);
    
    // Test basic interactions still work
    cy.contains('Note 0').click();
    cy.get('input').should('have.value', 'Note 0');
    cy.get('input').type(' Edited{enter}');
    cy.contains('Note 0 Edited').should('exist');
    
    // Verify task display
    cy.contains('Task 0 of Note 0').should('exist');
    
    // Test search functionality with many notes
    cy.contains('Search').click();
    cy.get('input[placeholder="Search all notes..."]').type('Task 1{enter}');
    cy.contains('Showing results for "Task 1"').should('exist');
    
    // Multiple results should be displayed
    cy.get('.search-results').find('div').should('have.length.greaterThan', 5);
  });

  it('should handle heavy load (30 notes, 20 tasks each)', () => {
    // This test is intensive and might be slow
    // Mock the context to provide heavy test data
    cy.stub(window, 'BoardState').as('boardState');
    cy.stub(window, 'useBoard').returns({
      state: generateTestData(30, 20),
      dispatch: cy.stub()
    });
    
    // Mount the component with performance monitoring
    const startTime = performance.now();
    
    mount(
      <AuthProvider>
        <BoardProvider>
          <Board />
        </BoardProvider>
      </AuthProvider>
    );
    
    // Verify rendering completed
    cy.get('.note-header').should('have.length', 30).then(() => {
      const renderTime = performance.now() - startTime;
      // Log the rendering time
      cy.log(`Initial render time: ${renderTime.toFixed(2)}ms`);
      
      // Assert render time is within reasonable bounds
      // This is somewhat arbitrary and depends on the test environment
      expect(renderTime).to.be.lessThan(5000);
    });
    
    // Test that UI is still responsive
    cy.contains('Note 15').scrollIntoView().should('be.visible');
    cy.contains('Note 15').click();
    cy.get('input').should('have.value', 'Note 15');
    
    // Try to add a new task - should still be responsive
    cy.get('input[placeholder="Add a task..."]').last().scrollIntoView().type('New task during stress test{enter}');
    cy.contains('New task during stress test').should('exist');
  });

  it('should handle rapid user interactions', () => {
    // Mock the context to provide test data
    cy.stub(window, 'BoardState').as('boardState');
    cy.stub(window, 'useBoard').returns({
      state: generateTestData(5, 5),
      dispatch: cy.stub().as('dispatch')
    });
    
    // Mount the component
    mount(
      <AuthProvider>
        <BoardProvider>
          <Board />
        </BoardProvider>
      </AuthProvider>
    );
    
    // Rapid sequence of user interactions
    cy.get('.note-header').eq(0).click(); // Focus first note
    
    // Series of quick interactions
    // 1. Click multiple buttons in succession
    cy.contains('Archive').click();
    cy.contains('Archived Tasks').should('exist');
    
    cy.contains('Search').click();
    cy.contains('Global Search').should('exist');
    
    cy.contains('History').click();
    cy.contains('Version History').should('exist');
    
    // 2. Rapid search operations
    cy.contains('Search').click();
    cy.get('input[placeholder="Search all notes..."]').type('Quick search{enter}');
    cy.contains('Clear').click();
    cy.get('input[placeholder="Search all notes..."]').type('Another search{enter}');
    cy.contains('Clear').click();
    
    // 3. Rapid task creation
    cy.get('input[placeholder="Add a task..."]').first().type('Quick task 1{enter}');
    cy.get('input[placeholder="Add a task..."]').first().type('Quick task 2{enter}');
    cy.get('input[placeholder="Add a task..."]').first().type('Quick task 3{enter}');
    
    // 4. Rapid note color changes
    cy.get('button[aria-label="More options"]').first().click();
    cy.contains('Change color').click();
    cy.contains('Blue').click();
    
    cy.get('button[aria-label="More options"]').first().click();
    cy.contains('Change color').click();
    cy.contains('Green').click();
    
    // UI should remain responsive throughout all these actions
    cy.contains('Quick task 3').should('exist');
    
    // Verify dispatch was called multiple times
    cy.get('@dispatch').should('have.been.called');
  });
});