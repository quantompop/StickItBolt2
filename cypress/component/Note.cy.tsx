import React from 'react';
import { mount } from 'cypress/react';
import Note from '../../src/components/Note';
import { BoardProvider } from '../../src/context/BoardContext';

describe('Note Component', () => {
  const mockNote = {
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

  beforeEach(() => {
    // Mount the component with necessary context providers
    mount(
      <BoardProvider>
        <Note note={mockNote} />
      </BoardProvider>
    );
  });

  it('displays the note title', () => {
    cy.contains('Test Note').should('be.visible');
  });

  it('displays all tasks', () => {
    cy.contains('Task 1').should('be.visible');
    cy.contains('Task 2').should('be.visible');
  });

  it('allows editing the title', () => {
    // Click on the title to start editing
    cy.contains('Test Note').click();
    
    // Type a new title
    cy.get('input').first().clear().type('Updated Title{enter}');
    
    // Verify the title changed
    cy.contains('Updated Title').should('be.visible');
  });

  it('allows adding a new task', () => {
    // Type in the task input
    cy.get('input[placeholder="Add a task..."]').type('New Task{enter}');
    
    // Verify the task was added
    cy.contains('New Task').should('be.visible');
  });

  it('shows the menu when clicking the more button', () => {
    // Click the more button
    cy.get('button[aria-label="More options"]').click();
    
    // Verify menu items are visible
    cy.contains('Rename note').should('be.visible');
    cy.contains('Change color').should('be.visible');
    cy.contains('Delete note').should('be.visible');
  });
});