/// <reference types="cypress" />

// Add custom commands here
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  cy.contains('Sign In').click();
});

Cypress.Commands.add('createNote', (title: string) => {
  cy.contains('Add Note').click();
  cy.contains('New Note').click();
  cy.get('input').first().clear().type(`${title}{enter}`);
});

Cypress.Commands.add('addTask', (noteSelector: string, taskText: string) => {
  cy.get(noteSelector).within(() => {
    cy.get('input[placeholder="Add a task..."]').type(`${taskText}{enter}`);
  });
});

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      createNote(title: string): Chainable<void>;
      addTask(noteSelector: string, taskText: string): Chainable<void>;
    }
  }
}