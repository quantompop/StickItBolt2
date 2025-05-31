import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBxkS7VHiZx9nGp_5uJH6I1NmrPFuJQCl0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "stickit-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "stickit-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "stickit-app.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "648871566918",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:648871566918:web:ee965f4f212a3e104af447"
};

// Initialize Firebase only in browser environment
let app, auth, db;

try {
  // Check if we're in an environment where Firebase can be initialized
  if (typeof window !== 'undefined') {
    // Initialize Firebase with default or environment values
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase initialized successfully");
  } else {
    // In a non-browser environment, provide mock objects
    console.warn("Firebase not initialized - non-browser environment detected");
    app = {};
    auth = { currentUser: null };
    db = {};
  }
} catch (error) {
  // Handle initialization errors
  console.error("Firebase initialization error:", error);
  
  // Provide mock objects to prevent crashes
  app = {};
  auth = { currentUser: null };
  db = {};
}

export { app, auth, db };