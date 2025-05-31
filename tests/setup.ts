import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import React from 'react';

// Extend Vitest's expect method with jest-dom's matchers
expect.extend(matchers);

// Create a mock localStorage before importing anything that might use it
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

// Setup globals for testing environment
global.localStorage = localStorageMock;
global.alert = vi.fn();
global.confirm = vi.fn().mockReturnValue(true);
global.prompt = vi.fn().mockReturnValue('Test description');

// Setup jsdom environment for DOM testing
const mockDocument = {
  querySelector: vi.fn(),
  querySelectorAll: vi.fn(() => []),
  activeElement: null
};

// Only define these if they don't already exist
if (!global.document) {
  Object.defineProperty(global, 'document', { value: mockDocument });
}

if (!global.HTMLElement) {
  class HTMLElementMock {}
  Object.defineProperty(global, 'HTMLElement', { value: HTMLElementMock });
}

// Mock fetch API
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: vi.fn().mockResolvedValue({})
});

// Mock performance API
if (!global.performance) {
  global.performance = {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn().mockReturnValue([{ duration: 100 }]),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn()
  };
}

// Mock window.electronAPI
global.window = global.window || {};
global.window.electronAPI = {
  getClipboardText: vi.fn(),
  onPasteText: vi.fn(),
  onNewNote: vi.fn(),
  onUpdateAvailable: vi.fn(),
  onUpdateDownloaded: vi.fn(),
  installUpdate: vi.fn()
};

// Mock navigator.onLine
Object.defineProperty(global.navigator, 'onLine', {
  configurable: true,
  get: vi.fn().mockReturnValue(true)
});

// Make sure React hooks are available globally for tests
global.React = React;
global.useState = React.useState;
global.useEffect = React.useEffect;
global.useRef = React.useRef;
global.useCallback = React.useCallback;
global.useMemo = React.useMemo;

// Mock Firebase Auth
vi.mock('firebase/auth', () => {
  return {
    getAuth: vi.fn(() => ({ currentUser: null })),
    createUserWithEmailAndPassword: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChanged: vi.fn((auth, callback) => {
      setTimeout(() => callback(null), 0);
      return vi.fn(); // Return unsubscribe function
    }),
    updateProfile: vi.fn(),
    sendPasswordResetEmail: vi.fn()
  };
});

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn(() => ({})),
    doc: vi.fn(() => ({ id: 'mock-doc-id' })),
    getDoc: vi.fn(() => ({
      exists: () => true,
      data: () => ({})
    })),
    getDocs: vi.fn(() => ({
      empty: false,
      docs: [],
      forEach: (callback) => {}
    })),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    query: vi.fn(() => ({})),
    where: vi.fn(() => ({})),
    addDoc: vi.fn(() => ({ id: 'mock-doc-id' })),
    getFirestore: vi.fn(() => ({})),
    runTransaction: vi.fn().mockImplementation(async (db, callback) => {
      return await callback({
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({ value: 'initial' })
        }),
        set: vi.fn(),
        update: vi.fn()
      });
    }),
    writeBatch: vi.fn(() => ({
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined)
    })),
    Timestamp: {
      now: () => ({ 
        toDate: () => new Date(), 
        toMillis: () => Date.now() 
      })
    }
  };
});

// Mock Firebase App
vi.mock('firebase/app', () => {
  return {
    initializeApp: vi.fn(() => ({}))
  };
});

// Run cleanup after each test case
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});