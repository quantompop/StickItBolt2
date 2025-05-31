import { doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from './config';
import { BoardState, Note } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Save board state to Firestore
export const saveBoardState = async (userId: string, boardState: BoardState) => {
  try {
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
    
    // Save the board data
    await setDoc(boardRef, boardData, { merge: true });
    
    return boardState.boardId;
  } catch (error) {
    console.error("Error saving board state:", error);
    throw error;
  }
};

// Get board state from Firestore
export const getBoardState = async (boardId: string) => {
  try {
    const boardRef = doc(db, 'boards', boardId);
    const boardSnap = await getDoc(boardRef);
    
    if (boardSnap.exists()) {
      return boardSnap.data() as BoardState;
    } else {
      // Return null instead of throwing an error
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
    const boardsQuery = query(collection(db, 'boards'), where('userId', '==', userId));
    const boardsSnap = await getDocs(boardsQuery);
    
    const boards: BoardState[] = [];
    boardsSnap.forEach((doc) => {
      boards.push(doc.data() as BoardState);
    });
    
    return boards;
  } catch (error) {
    console.error("Error getting user boards:", error);
    throw error;
  }
};

// Delete a board
export const deleteBoard = async (boardId: string) => {
  try {
    await deleteDoc(doc(db, 'boards', boardId));
    return true;
  } catch (error) {
    console.error("Error deleting board:", error);
    throw error;
  }
};

// Update a specific note in a board
export const updateNote = async (boardId: string, noteId: string, noteData: Partial<Note>) => {
  try {
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
    
    return true;
  } catch (error) {
    console.error("Error updating note:", error);
    throw error;
  }
};