import React from 'react';
import { NoteColor } from '../types';
import { getNoteColorClass } from '../utils/helpers';

interface ColorPickerProps {
  currentColor: string;
  onColorSelect: (color: NoteColor) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ currentColor, onColorSelect }) => {
  // Basic colors
  const basicColors: NoteColor[] = ['yellow', 'blue', 'green', 'pink', 'purple', 'orange', 'red'];
  
  // Extended colors
  const extendedColors: NoteColor[] = [
    'teal', 'indigo', 'lime', 'amber', 'cyan', 'rose', 'sky', 'emerald', 'fuchsia', 'violet', 'gray'
  ];
  
  return (
    <div className="p-3 bg-white rounded-lg shadow-lg">
      <div className="text-sm font-medium text-gray-700 mb-2">Basic Colors</div>
      <div className="flex flex-wrap gap-2 mb-3">
        {basicColors.map((color) => (
          <button
            key={color}
            className={`w-8 h-8 rounded-full ${getNoteColorClass(color)} transition-transform ${
              currentColor === color ? 'ring-2 ring-gray-700 scale-110' : ''
            }`}
            onClick={() => onColorSelect(color)}
            aria-label={`Select ${color} color`}
          />
        ))}
      </div>
      
      <div className="text-sm font-medium text-gray-700 mb-2">Extended Colors</div>
      <div className="flex flex-wrap gap-2">
        {extendedColors.map((color) => (
          <button
            key={color}
            className={`w-8 h-8 rounded-full ${getNoteColorClass(color)} transition-transform ${
              currentColor === color ? 'ring-2 ring-gray-700 scale-110' : ''
            }`}
            onClick={() => onColorSelect(color)}
            aria-label={`Select ${color} color`}
          />
        ))}
      </div>
    </div>
  );
};

export default ColorPicker;