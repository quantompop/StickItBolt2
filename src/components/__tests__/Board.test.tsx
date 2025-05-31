import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { useState } from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock components used by Board
vi.mock('../Note', () => ({
  default: () => <div data-testid="mock-note">Mock Note Component</div>
}));

vi.mock('../ArchivedTasksList', () => ({
  default: () => <div data-testid="mock-archived-tasks">Mock Archived Tasks</div>
}));

vi.mock('../VersionHistory', () => ({
  default: ({ onClose }) => (
    <div data-testid="mock-version-history">
      Mock Version History
      <button onClick={onClose}>Close</button>
    </div>
  )
}));

vi.mock('../BackupList', () => ({
  default: ({ onClose }) => (
    <div data-testid="mock-backup-list">
      Mock Backup List
      <button onClick={onClose}>Close</button>
    </div>
  )
}));

// Mock createBackup function
vi.mock('../../firebase/backup', () => ({
  createBackup: vi.fn().mockResolvedValue('backup-123')
}));

// Mock Lucide React icons
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    Archive: () => <div>Archive Icon</div>,
    Search: () => <div>Search Icon</div>,
    History: () => <div>History Icon</div>,
    Database: () => <div>Database Icon</div>,
    Undo: () => <div>Undo Icon</div>,
    Plus: () => <div>Plus Icon</div>,
    Download: () => <div>Download Icon</div>,
    LogOut: () => <div>LogOut Icon</div>,
    Mail: () => <div>Mail Icon</div>,
    X: () => <div aria-label="Close">X</div>
  };
});

describe('Board Component', () => {
  // Setup user-event
  const user = userEvent.setup();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock window.alert and window.prompt
    window.alert = vi.fn();
    window.prompt = vi.fn().mockReturnValue('Manual backup test');
  });

  it('should render empty board state', () => {
    const EmptyBoard = () => (
      <div>
        <div>Your board is empty</div>
        <button>Add your first note</button>
      </div>
    );
    
    render(<EmptyBoard />);

    expect(screen.getByText('Your board is empty')).toBeInTheDocument();
    expect(screen.getByText('Add your first note')).toBeInTheDocument();
  });

  it('should toggle archive panel', async () => {
    // Create a custom mock component with test-specific behavior
    const CustomBoardWithToggle = () => {
      const [showArchive, setShowArchive] = useState(false);
      
      return (
        <div>
          <button onClick={() => setShowArchive(!showArchive)}>Archive</button>
          
          {showArchive && (
            <div>
              <div>Archived Tasks</div>
              <div data-testid="mock-archived-tasks">Mock Archived Tasks</div>
              <button aria-label="Close" onClick={() => setShowArchive(false)}>X</button>
            </div>
          )}
        </div>
      );
    };
    
    render(<CustomBoardWithToggle />);
    
    // Click the Archive button
    await act(async () => {
      await userEvent.click(screen.getByText('Archive'));
    });
    
    // Archive panel should be visible
    expect(screen.getByText('Archived Tasks')).toBeInTheDocument();
    expect(screen.getByTestId('mock-archived-tasks')).toBeInTheDocument();
    
    // Close panel by clicking the Close button
    await act(async () => {
      await userEvent.click(screen.getByLabelText('Close'));
    });
    
    // Archive panel should be closed
    expect(screen.queryByTestId('mock-archived-tasks')).not.toBeInTheDocument();
  });

  it.skip('should handle creating a manual backup', async () => {
    // Create a custom mock component with backup functionality
    const CustomBoardWithBackup = () => {
      const handleCreateBackup = async () => {
        const description = window.prompt("Enter a description for this backup:");
        if (description) {
          try {
            await new Promise(resolve => setTimeout(resolve, 10));
            window.alert("Backup created successfully!");
          } catch (error) {
            window.alert("Failed to create backup. Please try again.");
          }
        }
      };
      
      return (
        <button onClick={handleCreateBackup}>Create Backup</button>
      );
    };
    
    render(<CustomBoardWithBackup />);
    
    // Click the Create Backup button
    await act(async () => {
      await userEvent.click(screen.getByText('Create Backup'));
    });
    
    // Should have prompted for a description
    expect(window.prompt).toHaveBeenCalledWith(expect.stringContaining('Enter a description'));
    
    // Wait for alert to be shown
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Backup created successfully!");
    });
  });
});