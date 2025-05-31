import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  registerUser, 
  signIn, 
  signOut, 
  resetPassword, 
  getCurrentUser, 
  onAuthChange 
} from '../authService';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  sendPasswordResetEmail, 
  updateProfile, 
  onAuthStateChanged, 
  User
} from 'firebase/auth';
import { auth } from '../config';

// Mock Firebase auth functions
vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updateProfile: vi.fn(),
  onAuthStateChanged: vi.fn(),
  getAuth: vi.fn()
}));

vi.mock('../config', () => ({
  auth: {
    currentUser: null
  }
}));

describe('Auth Service', () => {
  const mockUser = { 
    uid: '123', 
    email: 'test@example.com', 
    displayName: 'Test User' 
  } as unknown as User;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should create a new user and update profile', async () => {
      (createUserWithEmailAndPassword as any).mockResolvedValue({ 
        user: mockUser 
      });
      (updateProfile as any).mockResolvedValue(undefined);

      const result = await registerUser('test@example.com', 'password123', 'Test User');
      
      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        auth, 'test@example.com', 'password123'
      );
      expect(updateProfile).toHaveBeenCalledWith(
        mockUser, { displayName: 'Test User' }
      );
      expect(result).toBe(mockUser);
    });

    it('should throw an error if user creation fails', async () => {
      const error = new Error('Firebase error');
      (createUserWithEmailAndPassword as any).mockRejectedValue(error);

      await expect(registerUser('test@example.com', 'password123', 'Test User'))
        .rejects.toThrow(error);
    });
  });

  describe('signIn', () => {
    it('should sign in an existing user', async () => {
      (signInWithEmailAndPassword as any).mockResolvedValue({ 
        user: mockUser 
      });

      const result = await signIn('test@example.com', 'password123');
      
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        auth, 'test@example.com', 'password123'
      );
      expect(result).toBe(mockUser);
    });

    it('should throw an error if sign in fails', async () => {
      const error = new Error('Invalid credentials');
      (signInWithEmailAndPassword as any).mockRejectedValue(error);

      await expect(signIn('test@example.com', 'wrong-password'))
        .rejects.toThrow(error);
    });
  });

  describe('signOut', () => {
    it('should sign out the current user', async () => {
      (firebaseSignOut as any).mockResolvedValue(undefined);

      const result = await signOut();
      
      expect(firebaseSignOut).toHaveBeenCalledWith(auth);
      expect(result).toBe(true);
    });

    it('should throw an error if sign out fails', async () => {
      const error = new Error('Sign out failed');
      (firebaseSignOut as any).mockRejectedValue(error);

      await expect(signOut()).rejects.toThrow(error);
    });
  });

  describe('resetPassword', () => {
    it('should send a password reset email', async () => {
      (sendPasswordResetEmail as any).mockResolvedValue(undefined);

      const result = await resetPassword('test@example.com');
      
      expect(sendPasswordResetEmail).toHaveBeenCalledWith(auth, 'test@example.com');
      expect(result).toBe(true);
    });

    it('should throw an error if password reset fails', async () => {
      const error = new Error('Invalid email');
      (sendPasswordResetEmail as any).mockRejectedValue(error);

      await expect(resetPassword('invalid-email')).rejects.toThrow(error);
    });
  });

  describe('getCurrentUser', () => {
    it('should return the current user', () => {
      auth.currentUser = mockUser;
      const result = getCurrentUser();
      expect(result).toBe(mockUser);
    });

    it('should return null if no user is signed in', () => {
      auth.currentUser = null;
      const result = getCurrentUser();
      expect(result).toBeNull();
    });
  });

  describe('onAuthChange', () => {
    it('should set up an auth state listener', () => {
      const callback = vi.fn();
      (onAuthStateChanged as any).mockReturnValue(() => {});

      onAuthChange(callback);
      
      expect(onAuthStateChanged).toHaveBeenCalledWith(auth, callback);
    });
  });
});