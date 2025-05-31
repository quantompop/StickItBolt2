import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  saveBoardState, 
  getBoardState, 
  getUserBoards, 
  deleteBoard, 
  updateNote
} from '../storageService';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import { BoardState, Note } from '../../types';

// Mock Firestore functions
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');
  return {
    ...actual,
    collection: vi.fn(() => ({})),
    doc: vi.fn(() => ({ id: 'mock-doc-id' })),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    query: vi.fn(() => ({})),
    where: vi.fn(() => ({}))
  };
});

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-123')
}));

vi.mock('../config', () => ({
  db: {}
}));

describe('Storage Service', () => {
  const mockBoardState: Partial<BoardState> = {
    boardId: 'board-123',
    notes: [
      {
        id: 'note-1',
        title: 'Test Note',
        color: 'yellow',
        tasks: [],
        position: { x: 100, y: 100 },
        textSize: 14,
        taskSpacing: 8
      }
    ],
    archivedTasks: []
  };

  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Suppress console.error messages for tests that expect errors
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('saveBoardState', () => {
    it('should save board state to Firestore', async () => {
      const mockDocRef = { id: 'board-123' };
      (doc as any).mockReturnValue(mockDocRef);
      (setDoc as any).mockResolvedValue(undefined);

      const result = await saveBoardState(mockUserId, mockBoardState as BoardState);
      
      expect(doc).toHaveBeenCalled();
      expect(setDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          ...mockBoardState,
          userId: mockUserId,
          lastUpdated: expect.any(String)
        }),
        { merge: true }
      );
      expect(result).toBe('board-123');
    });

    it('should generate a boardId if none exists', async () => {
      const stateCopy = { ...mockBoardState };
      delete stateCopy.boardId;
      
      const mockDocRef = { id: 'mock-uuid-123' };
      (doc as any).mockReturnValue(mockDocRef);
      (setDoc as any).mockResolvedValue(undefined);

      const result = await saveBoardState(mockUserId, stateCopy as BoardState);
      
      expect(doc).toHaveBeenCalled();
      expect(setDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          ...stateCopy,
          boardId: 'mock-uuid-123',
          userId: mockUserId,
          lastUpdated: expect.any(String)
        }),
        { merge: true }
      );
      expect(result).toBe('mock-uuid-123');
    });

    it('should throw an error if saving fails', async () => {
      const error = new Error('Firestore error');
      (doc as any).mockReturnValue({});
      (setDoc as any).mockRejectedValue(error);

      await expect(saveBoardState(mockUserId, mockBoardState as BoardState))
        .rejects.toThrow(/Firestore error/);
    });
  });

  describe('getBoardState', () => {
    it('should retrieve board state from Firestore', async () => {
      const mockDocRef = { id: 'board-123' };
      const mockDocSnap = { 
        exists: () => true,
        data: () => mockBoardState
      };
      
      (doc as any).mockReturnValue(mockDocRef);
      (getDoc as any).mockResolvedValue(mockDocSnap);

      const result = await getBoardState('board-123');
      
      expect(doc).toHaveBeenCalled();
      expect(getDoc).toHaveBeenCalledWith(mockDocRef);
      expect(result).toEqual(mockBoardState);
    });

    it('should return null if board does not exist', async () => {
      const mockDocRef = { id: 'board-123' };
      const mockDocSnap = { 
        exists: () => false
      };
      
      (doc as any).mockReturnValue(mockDocRef);
      (getDoc as any).mockResolvedValue(mockDocSnap);

      const result = await getBoardState('board-123');
      
      // We expect null rather than throwing an error (changed behavior)
      expect(result).toBeNull();
    });
  });

  describe('getUserBoards', () => {
    it('should retrieve all boards for a user', async () => {
      const mockQueryRef = {};
      const mockQuerySnap = {
        forEach: (callback: (doc: any) => void) => {
          callback({
            data: () => mockBoardState
          });
        }
      };
      
      (collection as any).mockReturnValue({});
      (query as any).mockReturnValue(mockQueryRef);
      (where as any).mockReturnValue({});
      (getDocs as any).mockResolvedValue(mockQuerySnap);

      const result = await getUserBoards(mockUserId);
      
      expect(collection).toHaveBeenCalled();
      expect(query).toHaveBeenCalled();
      expect(where).toHaveBeenCalledWith('userId', '==', mockUserId);
      expect(getDocs).toHaveBeenCalledWith(mockQueryRef);
      expect(result).toEqual([mockBoardState]);
    });

    it('should return an empty array if no boards exist', async () => {
      const mockQueryRef = {};
      const mockQuerySnap = {
        forEach: () => {}
      };
      
      (collection as any).mockReturnValue({});
      (query as any).mockReturnValue(mockQueryRef);
      (where as any).mockReturnValue({});
      (getDocs as any).mockResolvedValue(mockQuerySnap);

      const result = await getUserBoards(mockUserId);
      
      expect(result).toEqual([]);
    });
  });

  describe('deleteBoard', () => {
    it('should delete a board', async () => {
      const mockDocRef = { id: 'board-123' };
      (doc as any).mockReturnValue(mockDocRef);
      (deleteDoc as any).mockResolvedValue(undefined);

      const result = await deleteBoard('board-123');
      
      expect(doc).toHaveBeenCalled();
      expect(deleteDoc).toHaveBeenCalledWith(mockDocRef);
      expect(result).toBe(true);
    });

    it('should throw an error if deletion fails', async () => {
      const error = new Error('Deletion failed');
      (doc as any).mockReturnValue({});
      (deleteDoc as any).mockRejectedValue(error);

      await expect(deleteBoard('board-123'))
        .rejects.toThrow(/Deletion failed/);
    });
  });

  describe('updateNote', () => {
    it('should update a specific note in a board', async () => {
      const mockDocRef = { id: 'board-123' };
      const mockDocSnap = { 
        exists: () => true,
        data: () => mockBoardState
      };
      
      (doc as any).mockReturnValue(mockDocRef);
      (getDoc as any).mockResolvedValue(mockDocSnap);
      (updateDoc as any).mockResolvedValue(undefined);

      const noteUpdate: Partial<Note> = {
        title: 'Updated Title'
      };

      const result = await updateNote('board-123', 'note-1', noteUpdate);
      
      expect(doc).toHaveBeenCalled();
      expect(getDoc).toHaveBeenCalledWith(mockDocRef);
      expect(updateDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          notes: expect.any(Array),
          lastUpdated: expect.any(String)
        })
      );
      expect(result).toBe(true);
    });

    it('should throw an error if board does not exist', async () => {
      const mockDocRef = { id: 'board-123' };
      const mockDocSnap = { 
        exists: () => false
      };
      
      (doc as any).mockReturnValue(mockDocRef);
      (getDoc as any).mockResolvedValue(mockDocSnap);

      await expect(updateNote('board-123', 'note-1', { title: 'Updated Title' }))
        .rejects.toThrow(/Board not found/);
    });
  });
});