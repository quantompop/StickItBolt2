import React, { useState, useEffect } from 'react';
import { Editor, EditorState, RichUtils, convertToRaw, convertFromRaw, ContentState } from 'draft-js';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onBlur?: () => void;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  content, 
  onChange, 
  onBlur,
  placeholder = 'Enter text...' 
}) => {
  // Initialize editor state from content prop or empty state
  const [editorState, setEditorState] = useState(() => {
    try {
      if (content && content.startsWith('{')) {
        // Try to parse the content as raw Draft.js content
        const contentState = convertFromRaw(JSON.parse(content));
        return EditorState.createWithContent(contentState);
      } else {
        // Create with plain text
        return EditorState.createWithContent(ContentState.createFromText(content || ''));
      }
    } catch (e) {
      console.log('Error parsing editor content:', e);
      // Fallback to plain text
      return EditorState.createWithContent(ContentState.createFromText(content || ''));
    }
  });

  // Update editor state when content prop changes
  useEffect(() => {
    if (content && !editorState.getCurrentContent().getPlainText()) {
      try {
        if (content.startsWith('{')) {
          const contentState = convertFromRaw(JSON.parse(content));
          setEditorState(EditorState.createWithContent(contentState));
        } else {
          setEditorState(EditorState.createWithContent(ContentState.createFromText(content)));
        }
      } catch (e) {
        console.log('Error updating editor content:', e);
      }
    }
  }, [content]);

  // Handle editor changes
  const handleEditorChange = (state: EditorState) => {
    setEditorState(state);
    
    // Convert editor content to raw format and pass to parent
    const rawContent = convertToRaw(state.getCurrentContent());
    onChange(JSON.stringify(rawContent));
  };

  // Apply inline styles (bold, italic, etc.)
  const handleInlineStyle = (style: string) => {
    handleEditorChange(RichUtils.toggleInlineStyle(editorState, style));
  };

  // Handle key commands (keyboard shortcuts)
  const handleKeyCommand = (command: string) => {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      handleEditorChange(newState);
      return 'handled';
    }
    return 'not-handled';
  };

  return (
    <div className="rich-text-editor border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
      <div className="toolbar flex space-x-1 border-b border-gray-300 p-1 bg-gray-50 rounded-t-md">
        <button
          type="button"
          onClick={() => handleInlineStyle('BOLD')}
          className={`p-1 rounded ${
            editorState.getCurrentInlineStyle().has('BOLD')
              ? 'bg-gray-300'
              : 'hover:bg-gray-200'
          }`}
          aria-label="Bold"
        >
          Bold
        </button>
        
        <button
          type="button"
          onClick={() => handleInlineStyle('ITALIC')}
          className={`p-1 rounded ${
            editorState.getCurrentInlineStyle().has('ITALIC')
              ? 'bg-gray-300'
              : 'hover:bg-gray-200'
          }`}
          aria-label="Italic"
        >
          Italic
        </button>
        
        <button
          type="button"
          onClick={() => handleInlineStyle('UNDERLINE')}
          className={`p-1 rounded ${
            editorState.getCurrentInlineStyle().has('UNDERLINE')
              ? 'bg-gray-300'
              : 'hover:bg-gray-200'
          }`}
          aria-label="Underline"
        >
          Underline
        </button>
        
        <button
          type="button"
          onClick={() => handleInlineStyle('CODE')}
          className={`p-1 rounded ${
            editorState.getCurrentInlineStyle().has('CODE')
              ? 'bg-gray-300'
              : 'hover:bg-gray-200'
          }`}
          aria-label="Code"
        >
          Code
        </button>
      </div>
      
      <div className="editor-container p-2" onBlur={onBlur}>
        <Editor
          editorState={editorState}
          onChange={handleEditorChange}
          handleKeyCommand={handleKeyCommand}
          placeholder={placeholder}
          spellCheck
        />
      </div>
    </div>
  );
};

export default RichTextEditor;