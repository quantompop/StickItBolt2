import { collection, query, where, getDocs, addDoc, deleteDoc, Timestamp, DocumentData, DocumentReference } from 'firebase/firestore';
import { db } from './config';
import { BoardState } from '../types';

// Interface for backup data
export interface Backup {
  id: string;
  userId: string;
  boardId: string;
  data: BoardState;
  createdAt: any;
  description: string;
}

// Create a backup of the board
export const createBackup = async (userId: string, boardId: string, boardData: BoardState) => {
  try {
    const backupCollection = collection(db, 'backups');
    
    // Create backup document
    const backupData = {
      userId,
      boardId,
      data: boardData,
      createdAt: Timestamp.now(),
      description: boardData.description || `Automatic backup - ${new Date().toLocaleString()}`
    };
    
    const backupRef = await addDoc(backupCollection, backupData);
    return backupRef.id;
  } catch (error) {
    console.error("Error creating backup:", error);
    throw new Error(`Failed to create backup: ${(error as Error).message}`);
  }
};

// Get all backups for a specific board
export const getBoardBackups = async (boardId: string): Promise<Backup[]> => {
  try {
    const backupsQuery = query(
      collection(db, 'backups'), 
      where('boardId', '==', boardId)
    );
    
    const backupsSnap = await getDocs(backupsQuery);
    
    const backups: Backup[] = [];
    backupsSnap.forEach((doc) => {
      backups.push({
        id: doc.id,
        ...doc.data()
      } as Backup);
    });
    
    // Sort by creation date, newest first
    return backups.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error("Error getting backups:", error);
    throw new Error(`Failed to get backups: ${(error as Error).message}`);
  }
};

// Get a specific backup
export const getBackupById = async (backupId: string): Promise<Backup> => {
  try {
    const backupCollection = collection(db, 'backups');
    const backupsQuery = query(backupCollection, where('__name__', '==', backupId));
    
    const backupSnap = await getDocs(backupsQuery);
    
    if (backupSnap.empty) {
      throw new Error("Backup not found");
    }
    
    const backupDoc = backupSnap.docs[0];
    return {
      id: backupDoc.id,
      ...backupDoc.data()
    } as Backup;
  } catch (error) {
    console.error("Error getting backup:", error);
    throw new Error(`Failed to get backup: ${(error as Error).message}`);
  }
};

// Delete a backup
export const deleteBackup = async (backupId: string): Promise<boolean> => {
  try {
    const backupCollection = collection(db, 'backups');
    const backupsQuery = query(backupCollection, where('__name__', '==', backupId));
    
    const backupSnap = await getDocs(backupsQuery);
    
    if (backupSnap.empty) {
      throw new Error("Backup not found");
    }
    
    // Get the document reference and delete it
    const backupDoc = backupSnap.docs[0];
    await deleteDoc(backupDoc.ref);
    
    return true;
  } catch (error) {
    console.error("Error deleting backup:", error);
    throw new Error(`Failed to delete backup: ${(error as Error).message}`);
  }
};