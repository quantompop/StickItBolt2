import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User, AuthState } from '../types';
import { onAuthChange, getCurrentUser } from '../firebase/authService';

// Action types
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' };

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null
};

// Create context
const AuthContext = createContext<{
  state: AuthState;
  dispatch: React.Dispatch<AuthAction>;
}>({
  state: initialState,
  dispatch: () => null
});

// Reducer function
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      };
    default:
      return state;
  }
};

// Provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // Set up auth state listener
    const unsubscribe = onAuthChange((user) => {
      if (user) {
        // User is signed in
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            id: user.uid,
            email: user.email || '',
            displayName: user.displayName || undefined
          }
        });
      } else {
        // User is signed out
        dispatch({ type: 'AUTH_LOGOUT' });
      }
    });

    // Initialize with current user if available
    const currentUser = getCurrentUser();
    if (currentUser) {
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          id: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || undefined
        }
      });
    } else {
      dispatch({ type: 'AUTH_LOGOUT' });
    }

    // Clean up subscription
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ state, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};