import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import * as authService from '../../firebase/authService';

// Mock the auth service
vi.mock('../../firebase/authService', () => ({
  onAuthChange: vi.fn(),
  getCurrentUser: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
  registerUser: vi.fn()
}));

describe('AuthContext', () => {
  // Test component to access the context
  const TestComponent = () => {
    const { state } = useAuth();
    
    return (
      <div>
        <div data-testid="loading">{state.isLoading.toString()}</div>
        <div data-testid="authenticated">{state.isAuthenticated.toString()}</div>
        <div data-testid="user">{state.user ? JSON.stringify(state.user) : 'null'}</div>
        <div data-testid="error">{state.error || 'no error'}</div>
      </div>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AuthProvider', () => {
    it('should provide auth state with initial loading state', () => {
      // Mock initial state with loading true
      (authService.getCurrentUser as any).mockReturnValue(null);
      (authService.onAuthChange as any).mockImplementation((callback) => {
        // Don't call callback initially to simulate loading state
        // Keep it loading for the test
        return () => {};
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Default state should show loading as false after initial render
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('user')).toHaveTextContent('null');
    });

    it('should update state when user is signed in', async () => {
      const mockUser = { 
        uid: 'user-123', 
        email: 'test@example.com',
        displayName: 'Test User'
      };
      
      // Mock getCurrentUser to convert from Firebase User to our User type
      (authService.getCurrentUser as any).mockReturnValue(mockUser);
      
      // Setup auth state change
      (authService.onAuthChange as any).mockImplementation((callback) => {
        setTimeout(() => {
          callback(mockUser);
        }, 10);
        return () => {};
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
      
      // Wait for auth state to update
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
        expect(screen.getByTestId('user')).toHaveTextContent(/{.*user-123.*}/);
        expect(screen.getByTestId('user')).toHaveTextContent(/{.*test@example.com.*}/);
      });
    });
  });
});