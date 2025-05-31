import { doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from './config';
import { BoardState, Note } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Save board state to Firestore
export const saveBoardState = async (userId: string, boardState: BoardState) => {
  try {
    if (!db) {
      console.error("Firestore instance is not initialized");
      throw new Error("Firebase database is not initialized");
    }
    
    // Create a boardId if one doesn't exist
    if (!boardState.boardId) {
      boardState.boardId = uuidv4();
    }
    
    // Reference to the board document
    const boardRef = doc(db, 'boards', boardState.boardId);
    
    // Create a copy of the board state with user info
    const boardData = {
      ...boardState,
      userId,
      lastUpdated: new Date().toISOString()
    };

    console.log(`Saving board ${boardState.boardId} to Firestore for user ${userId}`);
    
    // Save the board data
    await setDoc(boardRef, boardData, { merge: true });
    console.log(`Board ${boardState.boardId} saved successfully`);
    
    return boardState.boardId;
  } catch (error) {
    console.error("Error saving board state:", error);
    throw error;
  }
};

// Get board state from Firestore
export const getBoardState = async (boardId: string) => {
  try {
    if (!db) {
      console.error("Firestore instance is not initialized");
      throw new Error("Firebase database is not initialized");
    }
    
    console.log(`Fetching board ${boardId} from Firestore`);
    const boardRef = doc(db, 'boards', boardId);
    const boardSnap = await getDoc(boardRef);
    
    if (boardSnap.exists()) {
      console.log(`Found board ${boardId} in Firestore`);
      return boardSnap.data() as BoardState;
    } else {
      // Return null instead of throwing an error
      console.log(`Board ${boardId} not found in Firestore`);
      return null;
    }
  } catch (error) {
    console.error("Error getting board state:", error);
    throw error;
  }
};

// Get all boards for a user
export const getUserBoards = async (userId: string) => {
  try {
    if (!db) {
      console.error("Firestore instance is not initialized");
      throw new Error("Firebase database is not initialized");
    }
    
    console.log(`Fetching all boards for user ${userId}`);
    const boardsQuery = query(collection(db, 'boards'), where('userId', '==', userId));
    const boardsSnap = await getDocs(boardsQuery);
    
    const boards: BoardState[] = [];
    boardsSnap.forEach((doc) => {
      boards.push(doc.data() as BoardState);
    });
    
    console.log(`Found ${boards.length} boards for user ${userId}`);
    return boards;
  } catch (error) {
    console.error("Error getting user boards:", error);
    throw error;
  }
};

// Delete a board
export const deleteBoard = async (boardId: string) => {
  try {
    if (!db) {
      console.error("Firestore instance is not initialized");
      throw new Error("Firebase database is not initialized");
    }
    
    console.log(`Deleting board ${boardId}`);
    await deleteDoc(doc(db, 'boards', boardId));
    console.log(`Board ${boardId} deleted successfully`);
    return true;
  } catch (error) {
    console.error("Error deleting board:", error);
    throw error;
  }
};

// Update a specific note in a board
export const updateNote = async (boardId: string, noteId: string, noteData: Partial<Note>) => {
  try {
    if (!db) {
      console.error("Firestore instance is not initialized");
      throw new Error("Firebase database is not initialized");
    }
    
    console.log(`Updating note ${noteId} in board ${boardId}`);
    // Get the current board
    const boardRef = doc(db, 'boards', boardId);
    const boardSnap = await getDoc(boardRef);
    
    if (!boardSnap.exists()) {
      throw new Error("Board not found");
    }
    
    const boardData = boardSnap.data() as BoardState;
    
    // Find and update the specific note
    const updatedNotes = boardData.notes.map(note => 
      note.id === noteId ? { ...note, ...noteData } : note
    );
    
    // Update the board with the new notes array
    await updateDoc(boardRef, { 
      notes: updatedNotes,
      lastUpdated: new Date().toISOString()
    });
    
    console.log(`Note ${noteId} updated successfully`);
    return true;
  } catch (error) {
    console.error("Error updating note:", error);
    throw error;
  }
};