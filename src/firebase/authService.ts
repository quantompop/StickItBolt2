import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  User,
  onAuthStateChanged
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
    await firebaseSignOut(auth);
    return true;
  } catch (error) {
    throw error;
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

// Get current user
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Listen for auth state changes
export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};