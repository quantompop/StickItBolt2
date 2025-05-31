import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  User,
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { auth } from './config';

// Register a new user
export const registerUser = async (email: string, password: string, displayName: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Update the user's profile with the display name
    if (userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

// Sign in existing user
export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

// Sign out user
export const signOut = async () => {
  try {
    console.log('Attempting to sign out user...');
    
    // Make sure auth is initialized
    if (!auth) {
      console.error('Auth is not initialized');
      throw new Error('Authentication is not initialized');
    }
    
    // Check if there's a current user before signing out
    if (!auth.currentUser) {
      console.log('No user currently signed in');
      return true; // No need to sign out if no one is signed in
    }
    
    // Call Firebase signOut
    await firebaseSignOut(auth);
    console.log('User signed out successfully');
    
    // Clear any local authentication data
    localStorage.removeItem('authUser');
    
    return true;
  } catch (error) {
    console.error('Error signing out:', error);
    throw new Error(`Failed to sign out: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Reset password
export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) {
    throw error;
  }
};

// Change password (requires reauthentication)
export const changePassword = async (currentPassword: string, newPassword: string) => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error("User not logged in or email not available");
    }
    
    // Reauthenticate the user first
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    
    // Then update the password
    await updatePassword(user, newPassword);
    return true;
  } catch (error) {
    throw error;
  }
};

// Get current user
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Listen for auth state changes
export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};