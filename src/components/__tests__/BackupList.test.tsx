import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import BackupList from '../BackupList';
import * as backupService from '../../firebase/backup';

// Mock the backup service
vi.mock('../../firebase/backup', () => ({
  getBoardBackups: vi.fn(),
  getBackupById: vi.fn(),
  createBackup: vi.fn(),
  deleteBackup: vi.fn()
}));

// Mock the context
vi.mock('../../context/BoardContext', async () => {
  const originalModule = await vi.importActual('../../context/BoardContext');
  
  return {
    ...originalModule,
    useBoard: vi.fn(() => ({
      state: {
        boardId: 'board-123'
      },
      dispatch: vi.fn()
    }))
  };
});

describe('BackupList Component', () => {
  const mockBackups = [
    {
      id: 'backup-1',
      description: 'First backup',
      createdAt: { toDate: () => new Date(2023, 5, 15) },
      userId: 'user-1',
      boardId: 'board-123'
    },
    {
      id: 'backup-2',
      description: 'Second backup',
      createdAt: { toDate: () => new Date(2023, 5, 16) },
      userId: 'user-1',
      boardId: 'board-123'
    }
  ];

  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(backupService.getBoardBackups).mockResolvedValue(mockBackups);
    
    // Reset global mocks
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  it.skip('should load and display backups', async () => {
    render(<BackupList onClose={mockOnClose} />);

    // Wait for backups to load
    await waitFor(() => {
      expect(screen.getByText('First backup')).toBeInTheDocument();
    });
    
    // Should display the backups
    expect(screen.getByText('Second backup')).toBeInTheDocument();
  });

  it.skip('should handle search functionality', async () => {
    render(<BackupList onClose={mockOnClose} />);
    
    // Wait for backups to load
    await waitFor(() => {
      expect(screen.getByText('First backup')).toBeInTheDocument();
    });
    
    // Search for "First"
    const searchInput = screen.getByPlaceholderText('Search backups...');
    fireEvent.change(searchInput, { target: { value: 'First' } });
    
    // Should only show matching backup
    expect(screen.getByText('First backup')).toBeInTheDocument();
    expect(screen.queryByText('Second backup')).not.toBeInTheDocument();
    
    // Clear search
    fireEvent.click(screen.getByLabelText(/clear search/i));
    
    // Should show all backups again
    expect(screen.getByText('First backup')).toBeInTheDocument();
    expect(screen.getByText('Second backup')).toBeInTheDocument();
  });

  it.skip('should handle restore functionality', async () => {
    // Mock getBackupById to return a backup
    vi.mocked(backupService.getBackupById).mockResolvedValue({
      id: 'backup-1',
      description: 'First backup',
      createdAt: { toDate: () => new Date(2023, 5, 15) },
      userId: 'user-1',
      boardId: 'board-123',
      data: { notes: [], archivedTasks: [] }
    });
    
    render(<BackupList onClose={mockOnClose} />);
    
    // Wait for backups to load
    await waitFor(() => {
      expect(screen.getByText('First backup')).toBeInTheDocument();
    });
    
    // Click restore button
    const restoreButtons = screen.getAllByText('Restore');
    await act(async () => {
      await fireEvent.click(restoreButtons[0]);
    });
    
    // Should call getBackupById
    expect(backupService.getBackupById).toHaveBeenCalledWith('backup-1');
    
    // Wait for restore to complete
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it.skip('should handle errors', async () => {
    // Mock getBoardBackups to throw an error
    vi.mocked(backupService.getBoardBackups).mockRejectedValue(new Error('Failed to load backups'));
    
    render(<BackupList onClose={mockOnClose} />);
    
    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText('Failed to load backups')).toBeInTheDocument();
    });
  });
});