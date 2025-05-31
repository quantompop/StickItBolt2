import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  createBackup, 
  getBoardBackups, 
  getBackupById 
} from '../backup';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  Timestamp 
} from 'firebase/firestore';
import { BoardState } from '../../types';

// Mock Firestore functions
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');
  return {
    ...actual,
    collection: vi.fn(() => ({})),
    query: vi.fn(() => ({})),
    where: vi.fn(() => ({})),
    getDocs: vi.fn(),
    addDoc: vi.fn(),
    Timestamp: {
      now: vi.fn(() => ({ 
        toMillis: vi.fn(() => Date.now()),
        toDate: vi.fn(() => new Date())
      }))
    }
  };
});

vi.mock('../config', () => ({
  db: {}
}));

describe('Backup Service', () => {
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
    ]
  };

  const mockUserId = 'user-123';
  const mockBoardId = 'board-123';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Suppress console.error messages for tests that expect errors
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('createBackup', () => {
    it('should create a backup in Firestore', async () => {
      const mockBackupRef = { id: 'backup-123' };
      (collection as any).mockReturnValue({});
      (addDoc as any).mockResolvedValue(mockBackupRef);

      const result = await createBackup(mockUserId, mockBoardId, mockBoardState as BoardState);
      
      expect(collection).toHaveBeenCalledWith(expect.anything(), 'backups');
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: mockUserId,
          boardId: mockBoardId,
          data: mockBoardState,
          createdAt: expect.anything(),
          description: expect.stringContaining('Automatic backup')
        })
      );
      expect(result).toBe('backup-123');
    });

    it('should throw an error if backup creation fails', async () => {
      const error = new Error('Firestore error');
      (collection as any).mockReturnValue({});
      (addDoc as any).mockRejectedValue(error);

      await expect(createBackup(mockUserId, mockBoardId, mockBoardState as BoardState))
        .rejects.toThrow(/Failed to create backup/);
    });
  });

  describe('getBoardBackups', () => {
    it('should retrieve all backups for a board', async () => {
      const mockTimestamp = {
        toMillis: () => 1621234567890,
        toDate: () => new Date(1621234567890)
      };
      
      const mockBackups = [
        {
          id: 'backup-1',
          data: () => ({
            userId: mockUserId,
            boardId: mockBoardId,
            data: mockBoardState,
            createdAt: mockTimestamp,
            description: 'Backup 1'
          })
        },
        {
          id: 'backup-2',
          data: () => ({
            userId: mockUserId,
            boardId: mockBoardId,
            data: mockBoardState,
            createdAt: { ...mockTimestamp, toMillis: () => 1621234567891 },
            description: 'Backup 2'
          })
        }
      ];
      
      const mockQuerySnap = {
        empty: false,
        forEach: (callback: (doc: any) => void) => {
          mockBackups.forEach(callback);
        },
        docs: mockBackups
      };
      
      (collection as any).mockReturnValue({});
      (query as any).mockReturnValue({});
      (where as any).mockReturnValue({});
      (getDocs as any).mockResolvedValue(mockQuerySnap);

      const result = await getBoardBackups(mockBoardId);
      
      expect(collection).toHaveBeenCalledWith(expect.anything(), 'backups');
      expect(where).toHaveBeenCalledWith('boardId', '==', mockBoardId);
      expect(getDocs).toHaveBeenCalled();
      expect(result.length).toBe(2);
    });
  });

  describe('getBackupById', () => {
    it('should retrieve a specific backup', async () => {
      const mockBackupDoc = {
        id: 'backup-123',
        data: () => ({
          userId: mockUserId,
          boardId: mockBoardId,
          data: mockBoardState,
          createdAt: Timestamp.now(),
          description: 'Test Backup'
        })
      };
      
      const mockQuerySnap = {
        empty: false,
        docs: [mockBackupDoc]
      };
      
      (collection as any).mockReturnValue({});
      (query as any).mockReturnValue({});
      (where as any).mockReturnValue({});
      (getDocs as any).mockResolvedValue(mockQuerySnap);

      const result = await getBackupById('backup-123');
      
      expect(collection).toHaveBeenCalledWith(expect.anything(), 'backups');
      expect(where).toHaveBeenCalledWith('__name__', '==', 'backup-123');
      expect(getDocs).toHaveBeenCalled();
      expect(result.id).toBe('backup-123');
      expect(result.userId).toBe(mockUserId);
      expect(result.boardId).toBe(mockBoardId);
    });

    it('should throw an error if backup is not found', async () => {
      const mockQuerySnap = {
        empty: true,
        docs: []
      };
      
      (collection as any).mockReturnValue({});
      (query as any).mockReturnValue({});
      (where as any).mockReturnValue({});
      (getDocs as any).mockResolvedValue(mockQuerySnap);

      await expect(getBackupById('nonexistent-backup'))
        .rejects.toThrow(/Backup not found/);
    });
  });
});