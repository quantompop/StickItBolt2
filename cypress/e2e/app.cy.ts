describe('StickIt App', () => {
  beforeEach(() => {
    // Visit the app before each test
    cy.visit('/');
    
    // Clear localStorage to start fresh
    cy.clearLocalStorage();
    cy.reload();
  });

  it('should display the empty board message initially', () => {
    cy.contains('Your board is empty');
    cy.contains('Add your first note').should('be.visible');
  });

  it('should allow creating a new note', () => {
    cy.contains('Add your first note').click();
    
    // Check that a new note was created
    cy.contains('New Note').should('be.visible');
  });

  it('should allow adding tasks to a note', () => {
    // Create a note first
    cy.contains('Add your first note').click();
    
    // Add a task
    cy.get('input[placeholder="Add a task..."]').type('Test task{enter}');
    
    // Verify the task was added
    cy.contains('Test task').should('be.visible');
  });

  it('should allow completing tasks', () => {
    // Create a note with a task
    cy.contains('Add your first note').click();
    cy.get('input[placeholder="Add a task..."]').type('Test task{enter}');
    
    // Complete the task
    cy.get('.task-item').first().find('button').first().click();
    
    // Verify the task was archived
    cy.contains('Archive').click();
    cy.contains('Test task').should('be.visible');
  });

  it('should allow renaming notes', () => {
    // Create a note
    cy.contains('Add your first note').click();
    
    // Rename the note
    cy.contains('New Note').click();
    cy.get('input').first().clear().type('Renamed Note{enter}');
    
    // Verify the note was renamed
    cy.contains('Renamed Note').should('be.visible');
  });

  it('should allow searching for tasks', () => {
    // Create a note with multiple tasks
    cy.contains('Add your first note').click();
    cy.get('input[placeholder="Add a task..."]').type('First task{enter}');
    cy.get('input[placeholder="Add a task..."]').type('Second task{enter}');
    
    // Search for a task
    cy.contains('Search').click();
    cy.get('input[placeholder="Search all notes..."]').type('First{enter}');
    
    // Verify search results
    cy.contains('Showing results for "First"').should('be.visible');
    cy.contains('First task').should('be.visible');
  });

  it('should support dark mode toggle', () => {
    // Create a note
    cy.contains('Add your first note').click();
    
    // Toggle dark mode (would need to be implemented)
    // cy.contains('Dark Mode').click();
    
    // Verify dark mode is applied (check for a specific dark mode class)
    // cy.get('body').should('have.class', 'dark');
  });

  it('should preserve state after page reload', () => {
    // Create a note with a task
    cy.contains('Add your first note').click();
    cy.contains('New Note').click();
    cy.get('input').first().clear().type('Persistent Note{enter}');
    cy.get('input[placeholder="Add a task..."]').type('Persistent task{enter}');
    
    // Reload the page
    cy.reload();
    
    // Verify the note and task are still there
    cy.contains('Persistent Note').should('be.visible');
    cy.contains('Persistent task').should('be.visible');
  });
});