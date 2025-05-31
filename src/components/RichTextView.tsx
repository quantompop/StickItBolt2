import React from 'react';
import { Editor, EditorState, convertFromRaw, ContentState } from 'draft-js';
import 'draft-js/dist/Draft.css';

interface RichTextViewProps {
  content: string;
  className?: string;
}

const RichTextView: React.FC<RichTextViewProps> = ({ content, className = '' }) => {
  // Create editor state from content
  const editorState = React.useMemo(() => {
    if (!content) {
      return EditorState.createWithContent(ContentState.createFromText(''));
    }
    
    try {
      // Try to parse as Draft.js raw content
      const contentState = convertFromRaw(JSON.parse(content));
      return EditorState.createWithContent(contentState);
    } catch (e) {
      // If parsing fails, treat as plain text
      return EditorState.createWithContent(ContentState.createFromText(content));
    }
  }, [content]);
  
  return (
    <div className={`rich-text-view ${className}`}>
      <Editor
        editorState={editorState}
        onChange={() => {}}
        readOnly={true}
      />
    </div>
  );
};

export default RichTextView;