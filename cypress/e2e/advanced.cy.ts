// Advanced E2E tests for StickIt app
describe('Advanced StickIt Workflows', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();
    
    // Set up a board with notes and tasks
    cy.contains('Add your first note').click();
    cy.contains('New Note').click();
    cy.get('input').first().clear().type('Test Note 1{enter}');
    cy.get('input[placeholder="Add a task..."]').type('First task{enter}');
    cy.get('input[placeholder="Add a task..."]').type('Second task{enter}');
    cy.get('input[placeholder="Add a task..."]').type('Third task{enter}');
  });

  it('should support task indentation and priority management', () => {
    // Right-click on second task to open context menu
    cy.contains('Second task').rightclick();
    
    // Click the indent option
    cy.contains('Indent').click();
    
    // Verify the task is indented
    cy.contains('Second task').parent().should('have.css', 'margin-left', '20px');
    
    // Right-click on third task to open context menu
    cy.contains('Third task').rightclick();
    
    // Click on set priority
    cy.contains('Set priority').click();
    
    // Select high priority
    cy.contains('High').click();
    
    // Verify high priority flag is shown (red flag icon)
    cy.contains('Third task').parent().find('svg').should('exist');
  });

  it('should support drag and drop operations', () => {
    // Create a second note
    cy.contains('Add Note').click();
    cy.contains('Yellow').click();
    
    // There should now be two notes
    cy.get('.note-header').should('have.length', 2);
    
    // Find the source task element
    cy.contains('First task').as('sourceTask');
    
    // Find the target note
    cy.get('.note-header').last().parent().as('targetNote');
    
    // Perform drag and drop (this can be flaky in Cypress)
    // Using a workaround since Cypress doesn't fully support HTML5 drag and drop
    cy.get('@sourceTask')
      .trigger('mousedown', { which: 1 })
      .trigger('dragstart');
    
    cy.get('@targetNote')
      .trigger('dragover')
      .trigger('drop');
    
    cy.get('@sourceTask')
      .trigger('dragend');
    
    // Verify the task moved to the second note
    cy.get('@targetNote').contains('First task').should('exist');
    cy.get('@sourceTask').should('not.exist');
  });

  it('should support task searching with special characters', () => {
    // Add a task with special characters
    cy.get('input[placeholder="Add a task..."]').type('Task with $pecial Ch@racters!{enter}');
    
    // Open search
    cy.contains('Search').click();
    
    // Search for special characters
    cy.get('input[placeholder="Search all notes..."]').type('$pecial{enter}');
    
    // Verify search results
    cy.contains('Showing results for "$pecial"').should('exist');
    cy.contains('Task with $pecial Ch@racters!').should('be.visible');
    cy.contains('First task').should('not.be.visible');
  });

  it('should handle large number of tasks and notes without performance issues', () => {
    // Add many tasks (20) to the note
    for (let i = 4; i <= 20; i++) {
      cy.get('input[placeholder="Add a task..."]').type(`Task ${i}{enter}`);
    }
    
    // Add several more notes (10 total)
    for (let i = 2; i <= 10; i++) {
      cy.contains('Add Note').click();
      cy.contains('Yellow').click();
      
      // Rename each note
      cy.get('.note-header').last().find('h3').click();
      cy.get('input').first().clear().type(`Test Note ${i}{enter}`);
      
      // Add a few tasks to each note
      cy.get('input[placeholder="Add a task..."]').last().type(`Note ${i} Task 1{enter}`);
      cy.get('input[placeholder="Add a task..."]').last().type(`Note ${i} Task 2{enter}`);
      cy.get('input[placeholder="Add a task..."]').last().type(`Note ${i} Task 3{enter}`);
    }
    
    // Verify all 10 notes were created
    cy.get('.note-header').should('have.length', 10);
    
    // Perform a search that will need to search through all notes
    cy.contains('Search').click();
    cy.get('input[placeholder="Search all notes..."]').type('Task 3{enter}');
    
    // Should find tasks from all notes
    cy.get('.search-results').find('div').should('have.length.greaterThan', 8);
    
    // The UI should remain responsive (hard to test directly in Cypress)
    // But we can verify basic interactions still work
    cy.contains('Clear').click();
    cy.contains('Showing results').should('not.exist');
  });

  it('should properly handle browser refresh and maintain state', () => {
    // Add a distinctive task
    cy.get('input[placeholder="Add a task..."]').type('Persistent after refresh{enter}');
    
    // Reload the page
    cy.reload();
    
    // Verify the state persisted
    cy.contains('Test Note 1').should('exist');
    cy.contains('First task').should('exist');
    cy.contains('Persistent after refresh').should('exist');
    
    // Make another change
    cy.contains('First task').click();
    cy.get('input').first().clear().type('Modified after reload{enter}');
    
    // Reload again
    cy.reload();
    
    // Verify the change persisted
    cy.contains('Modified after reload').should('exist');
  });

  it('should handle multiple consecutive operations without errors', () => {
    // Perform a rapid sequence of operations
    
    // 1. Complete a task
    cy.contains('First task').parent().find('button').first().click();
    
    // 2. Immediately edit another task
    cy.contains('Second task').click();
    cy.get('input').first().clear().type('Edited second task{enter}');
    
    // 3. Add a new task
    cy.get('input[placeholder="Add a task..."]').type('New task after edits{enter}');
    
    // 4. Open archive panel
    cy.contains('Archive').click();
    
    // 5. Restore the archived task
    cy.get('button').contains('Restore').click();
    
    // 6. Search for all tasks
    cy.contains('Search').click();
    cy.get('input[placeholder="Search all notes..."]').type('task{enter}');
    
    // Verify the board is still functional
    cy.contains('Showing results for "task"').should('exist');
    cy.contains('First task').should('exist');
    cy.contains('Edited second task').should('exist');
    cy.contains('New task after edits').should('exist');
  });

  it('should support keyboard shortcuts and accessibility navigation', () => {
    // Tab through the app interface
    cy.get('body').tab();
    
    // The first focusable element should be focused
    cy.focused().should('have.attr', 'aria-label').and('include', 'Add Note');
    
    // Tab to the next button
    cy.focused().tab();
    cy.focused().should('have.text', 'Archive');
    
    // Continue tabbing to reach the note
    for (let i = 0; i < 10; i++) {
      cy.focused().tab();
    }
    
    // At some point we should reach the note's add task input
    cy.focused().should('have.attr', 'placeholder', 'Add a task...');
    
    // Type a task using keyboard only
    cy.focused().type('Keyboard navigation task{enter}');
    
    // Verify task was added
    cy.contains('Keyboard navigation task').should('exist');
  });
});

// Extend Cypress commands for accessibility testing
// This would require additional plugins in a real project
Cypress.Commands.add('tab', { prevSubject: 'optional' }, (subject) => {
  if (subject) {
    cy.wrap(subject).trigger('keydown', { keyCode: 9, which: 9 });
  } else {
    cy.get('body').trigger('keydown', { keyCode: 9, which: 9 });
  }
});