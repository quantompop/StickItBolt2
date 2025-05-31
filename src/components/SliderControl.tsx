import React from 'react';

interface SliderControlProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  onClose?: () => void;
  label: string;
  decreaseLabel?: string;
  increaseLabel?: string;
  unit?: string;
}

const SliderControl: React.FC<SliderControlProps> = ({
  value, 
  min, 
  max, 
  step = 1, 
  onChange, 
  onClose,
  label,
  decreaseLabel = "Smaller",
  increaseLabel = "Larger",
  unit = "px"
}) => {
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value);
    onChange(newValue);
  };
  
  const handleDecrease = () => {
    const newValue = Math.max(min, value - step);
    onChange(newValue);
  };
  
  const handleIncrease = () => {
    const newValue = Math.min(max, value + step);
    onChange(newValue);
  };
  
  const handleReset = () => {
    const defaultValue = Math.round((min + max) / 2);
    onChange(defaultValue);
  };
  
  return (
    <div className="slider-container p-3 bg-white rounded-lg shadow-lg">
      <div className="mb-2 font-medium text-gray-700">{label}</div>
      
      <div className="flex items-center justify-between mb-2">
        <button 
          className="text-sm bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
          onClick={handleDecrease}
          type="button"
          aria-label="Decrease value"
        >
          {decreaseLabel}
        </button>
        <span className="text-lg font-medium">{value}{unit}</span>
        <button 
          className="text-sm bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
          onClick={handleIncrease}
          type="button"
          aria-label="Increase value"
        >
          {increaseLabel}
        </button>
      </div>
      
      <div className="flex items-center space-x-2 mb-3">
        <span className="text-xs">{min}{unit}</span>
        <input 
          type="range" 
          min={min} 
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className="flex-grow h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          aria-label={`Adjust ${label}`}
        />
        <span className="text-xs">{max}{unit}</span>
      </div>
      
      <div className="flex justify-between">
        {onClose && (
          <button 
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
            onClick={onClose}
            type="button"
            aria-label="Done"
          >
            Done
          </button>
        )}
        <button 
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm"
          onClick={handleReset}
          type="button"
          aria-label="Reset to default value"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default SliderControl;