import React, { useState } from 'react';

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
  const [text, setText] = useState(content || '');
  
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    
    // Create a simple JSON structure that mimics rich text format
    // This allows us to be compatible with a future upgrade to a real rich text editor
    const simpleFormat = {
      blocks: [
        {
          key: '1',
          text: newText,
          type: 'unstyled',
          depth: 0,
          inlineStyleRanges: [],
          entityRanges: [],
          data: {}
        }
      ],
      entityMap: {}
    };
    
    // Pass the formatted text to the parent
    onChange(JSON.stringify(simpleFormat));
  };
  
  const handleBoldClick = () => {
    // Wrap selected text with ** (markdown-like formatting)
    const textarea = document.getElementById('rich-editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    if (selectedText) {
      const newText = 
        textarea.value.substring(0, start) + 
        `**${selectedText}**` + 
        textarea.value.substring(end);
      
      setText(newText);
      
      // Create simple JSON structure
      const simpleFormat = {
        blocks: [{ 
          key: '1', 
          text: newText, 
          type: 'unstyled',
          depth: 0,
          inlineStyleRanges: [],
          entityRanges: [],
          data: {}
        }],
        entityMap: {}
      };
      
      onChange(JSON.stringify(simpleFormat));
      
      // Reset selection
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 2, end + 2);
      }, 0);
    }
  };
  
  const handleItalicClick = () => {
    // Wrap selected text with * (markdown-like formatting)
    const textarea = document.getElementById('rich-editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    if (selectedText) {
      const newText = 
        textarea.value.substring(0, start) + 
        `*${selectedText}*` + 
        textarea.value.substring(end);
      
      setText(newText);
      
      // Create simple JSON structure
      const simpleFormat = {
        blocks: [{ 
          key: '1', 
          text: newText, 
          type: 'unstyled',
          depth: 0,
          inlineStyleRanges: [],
          entityRanges: [],
          data: {}
        }],
        entityMap: {}
      };
      
      onChange(JSON.stringify(simpleFormat));
      
      // Reset selection
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 1, end + 1);
      }, 0);
    }
  };
  
  const handleUnderlineClick = () => {
    // Wrap selected text with __ (markdown-like formatting)
    const textarea = document.getElementById('rich-editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    if (selectedText) {
      const newText = 
        textarea.value.substring(0, start) + 
        `__${selectedText}__` + 
        textarea.value.substring(end);
      
      setText(newText);
      
      // Create simple JSON structure
      const simpleFormat = {
        blocks: [{ 
          key: '1', 
          text: newText, 
          type: 'unstyled',
          depth: 0,
          inlineStyleRanges: [],
          entityRanges: [],
          data: {}
        }],
        entityMap: {}
      };
      
      onChange(JSON.stringify(simpleFormat));
      
      // Reset selection
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 2, end + 2);
      }, 0);
    }
  };
  
  const handleCodeClick = () => {
    // Wrap selected text with ` (markdown-like formatting)
    const textarea = document.getElementById('rich-editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    if (selectedText) {
      const newText = 
        textarea.value.substring(0, start) + 
        `\`${selectedText}\`` + 
        textarea.value.substring(end);
      
      setText(newText);
      
      // Create simple JSON structure
      const simpleFormat = {
        blocks: [{ 
          key: '1', 
          text: newText, 
          type: 'unstyled',
          depth: 0,
          inlineStyleRanges: [],
          entityRanges: [],
          data: {}
        }],
        entityMap: {}
      };
      
      onChange(JSON.stringify(simpleFormat));
      
      // Reset selection
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 1, end + 1);
      }, 0);
    }
  };

  return (
    <div className="rich-text-editor border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
      <div className="toolbar flex space-x-1 border-b border-gray-300 p-1 bg-gray-50 rounded-t-md">
        <button
          type="button"
          onClick={handleBoldClick}
          className="p-1 rounded hover:bg-gray-200"
          aria-label="Bold"
        >
          Bold
        </button>
        
        <button
          type="button"
          onClick={handleItalicClick}
          className="p-1 rounded hover:bg-gray-200"
          aria-label="Italic"
        >
          Italic
        </button>
        
        <button
          type="button"
          onClick={handleUnderlineClick}
          className="p-1 rounded hover:bg-gray-200"
          aria-label="Underline"
        >
          Underline
        </button>
        
        <button
          type="button"
          onClick={handleCodeClick}
          className="p-1 rounded hover:bg-gray-200"
          aria-label="Code"
        >
          Code
        </button>
      </div>
      
      <div className="editor-container p-2" onBlur={onBlur}>
        <textarea
          id="rich-editor-textarea"
          value={text}
          onChange={handleTextChange}
          placeholder={placeholder}
          className="w-full min-h-[80px] outline-none resize-y"
          onBlur={onBlur}
          style={{ fontFamily: 'inherit', fontSize: 'inherit' }}
        />
      </div>
    </div>
  );
};

export default RichTextEditor;