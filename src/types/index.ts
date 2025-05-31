// Types for the StickIt app

export type TaskPriority = 'none' | 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  indentation: number;
  priority: TaskPriority;
  recurrence?: RecurrencePattern; // Optional recurrence pattern
  dueDate?: string; // Optional due date in ISO format
}

export interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // Every X days, weeks, etc.
  daysOfWeek?: number[]; // For weekly: 0=Sunday, 6=Saturday
  dayOfMonth?: number; // For monthly
  endDate?: string; // When recurrence ends (ISO date string)
  occurrences?: number; // Number of occurrences
}

export interface ArchivedTask {
  id: string;
  text: string;
  noteId: string;
  noteTitle: string;
  completedAt: number; // timestamp
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  createdAt: number;
}

export interface Note {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
  position: {
    x: number;
    y: number;
  };
  textSize: number; // New property for text size
  taskSpacing: number; // New property for task spacing
  attachments?: Attachment[]; // Optional attachments
}

export type NoteColor = 
  | 'yellow' 
  | 'blue' 
  | 'green' 
  | 'pink' 
  | 'purple' 
  | 'orange' 
  | 'red'
  | 'teal'
  | 'indigo'
  | 'lime'
  | 'amber'
  | 'cyan'
  | 'rose'
  | 'sky'
  | 'emerald'
  | 'fuchsia'
  | 'violet'
  | 'gray';

export interface VersionSnapshot {
  timestamp: number;
  data: BoardState;
  description: string;
}

export interface BoardState {
  boardId?: string;
  userId?: string;
  notes: Note[];
  archivedTasks: ArchivedTask[];
  draggedTask: {
    taskId: string | null;
    noteId: string | null;
    isDragging: boolean;
  };
  search: {
    term: string;
    isActive: boolean;
    scope: 'global' | 'note' | 'archive';
    noteId: string | null;
  };
  versionHistory: VersionSnapshot[];
  undoStack: {
    type: string;
    payload: any;
    timestamp: number;
  }[];
  isSynced?: boolean;
  lastSyncTime?: number;
}

export interface User {
  id: string;
  email: string;
  displayName?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}