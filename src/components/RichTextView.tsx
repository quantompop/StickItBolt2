import React from 'react';

interface RichTextViewProps {
  content: string;
  className?: string;
}

const RichTextView: React.FC<RichTextViewProps> = ({ content, className = '' }) => {
  // Extract plain text from potentially rich content
  const getPlainText = (richContent: string): string => {
    if (!richContent) return '';
    
    try {
      // If it looks like JSON, try to extract plain text
      if (richContent.startsWith('{')) {
        const parsed = JSON.parse(richContent);
        // Look for blocks of content - common in rich text formats
        if (parsed.blocks && Array.isArray(parsed.blocks)) {
          return parsed.blocks
            .map((block: any) => block.text || '')
            .filter(Boolean)
            .join('\n');
        }
        return richContent;
      }
      
      // Just return as plain text
      return richContent;
    } catch (e) {
      console.error('Error parsing rich text content:', e);
      return richContent;
    }
  };
  
  // Process content to handle special formatting like bold and italics
  const processContent = (content: string): string => {
    if (!content) return '';
    
    return content
      // Replace common markdown-like patterns
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
      .replace(/__(.*?)__/g, '<u>$1</u>') // Underline
      .replace(/`(.*?)`/g, '<code>$1</code>'); // Code
  };
  
  const plainText = getPlainText(content);
  const formattedContent = processContent(plainText);
  
  return (
    <div className={`rich-text-view ${className}`}>
      {/* Using dangerouslySetInnerHTML for simple formatting - normally we would use a more robust solution */}
      <div dangerouslySetInnerHTML={{ __html: formattedContent }} />
    </div>
  );
};

export default RichTextView;