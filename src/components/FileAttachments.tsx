import React, { useState, useRef } from 'react';
import { useBoard, ADD_ATTACHMENT, REMOVE_ATTACHMENT } from '../context/BoardContext';
import { Attachment } from '../types';

interface FileAttachmentsProps {
  noteId: string;
  attachments: Attachment[];
}

// Define allowed file types and maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

const FileAttachments: React.FC<FileAttachmentsProps> = ({ noteId, attachments = [] }) => {
  const { dispatch } = useBoard();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Handle file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setError('');
    
    // In a real app, we'd upload to Firebase Storage
    // For this demo, we'll use a data URL approach
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Check file type
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        setError(`File type not supported: ${file.type}`);
        continue;
      }
      
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        setError(`File too large: ${formatFileSize(file.size)}. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}`);
        continue;
      }
      
      setIsUploading(true);
      
      try {
        // Read the file as a data URL (base64)
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        
        // Create attachment object
        const attachment: Attachment = {
          id: `attachment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: file.type,
          size: file.size,
          url: dataUrl, // In a real app, this would be a Firebase Storage URL
          createdAt: Date.now()
        };
        
        // Add attachment to note
        dispatch({
          type: ADD_ATTACHMENT,
          payload: { noteId, attachment }
        });
      } catch (err) {
        console.error('Error reading file:', err);
        setError('Failed to read file. Please try again.');
      } finally {
        setIsUploading(false);
      }
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle attachment removal
  const handleRemoveAttachment = (attachmentId: string) => {
    dispatch({
      type: REMOVE_ATTACHMENT,
      payload: { noteId, attachmentId }
    });
  };

  // Open attachment in a new tab
  const handleOpenAttachment = (attachment: Attachment) => {
    window.open(attachment.url, '_blank');
  };

  return (
    <div className="mt-3">
      {/* Attachments list */}
      {attachments.length > 0 && (
        <div className="mb-2 space-y-2">
          {attachments.map((attachment) => (
            <div 
              key={attachment.id} 
              className="flex items-center p-2 bg-gray-50 rounded border border-gray-200"
            >
              <div className="mr-2">
                📎
              </div>
              <div className="flex-grow truncate">
                <div className="text-sm font-medium truncate">{attachment.name}</div>
                <div className="text-xs text-gray-500">{formatFileSize(attachment.size)}</div>
              </div>
              <div className="flex space-x-1">
                <button
                  className="p-1 text-gray-500 hover:text-blue-600 rounded"
                  onClick={() => handleOpenAttachment(attachment)}
                  aria-label="Open attachment"
                  title="Open"
                >
                  🔍
                </button>
                <button
                  className="p-1 text-gray-500 hover:text-red-600 rounded"
                  onClick={() => handleRemoveAttachment(attachment.id)}
                  aria-label="Remove attachment"
                  title="Remove"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="mb-2 text-red-600 text-sm">{error}</div>
      )}
      
      {/* Upload button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          id={`file-upload-${noteId}`}
          className="hidden"
          onChange={handleFileChange}
          multiple
          accept={ALLOWED_FILE_TYPES.join(',')}
        />
        <label
          htmlFor={`file-upload-${noteId}`}
          className={`inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isUploading ? 'Uploading...' : (attachments.length > 0 ? 'Add more files' : 'Attach files')}
        </label>
        <p className="text-xs text-gray-500 mt-1">
          Max size: {formatFileSize(MAX_FILE_SIZE)} per file
        </p>
      </div>
    </div>
  );
};

export default FileAttachments;