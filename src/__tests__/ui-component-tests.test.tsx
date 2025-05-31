import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SliderControl from '../components/SliderControl';

describe('UI Component Tests', () => {
  // Setup user-event
  const user = userEvent.setup();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('SliderControl Component', () => {
    it('should render with proper labels and values', () => {
      const handleChange = vi.fn();
      const handleClose = vi.fn();
      
      render(
        <SliderControl
          value={14}
          min={10}
          max={20}
          onChange={handleChange}
          onClose={handleClose}
          label="Text Size"
          decreaseLabel="Smaller"
          increaseLabel="Larger"
          unit="px"
        />
      );
      
      expect(screen.getByText('Text Size')).toBeInTheDocument();
      expect(screen.getByText('14px')).toBeInTheDocument();
      expect(screen.getByText('Smaller')).toBeInTheDocument();
      expect(screen.getByText('Larger')).toBeInTheDocument();
      expect(screen.getByText('Done')).toBeInTheDocument();
      expect(screen.getByText('Reset')).toBeInTheDocument();
      
      // Verify slider input exists
      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveAttribute('min', '10');
      expect(slider).toHaveAttribute('max', '20');
      expect(slider).toHaveAttribute('value', '14');
    });
    
    it('should call onChange when slider value changes', async () => {
      const handleChange = vi.fn();
      
      render(
        <SliderControl
          value={14}
          min={10}
          max={20}
          onChange={handleChange}
          label="Text Size"
        />
      );
      
      const slider = screen.getByRole('slider') as HTMLInputElement;
      
      // Change the slider value
      fireEvent.change(slider, { target: { value: '16' } });
      
      // Check if onChange was called with the new value
      expect(handleChange).toHaveBeenCalledWith(16);
    });
    
    it('should call onChange when increment/decrement buttons are clicked', async () => {
      const handleChange = vi.fn();
      
      // Render with value 14
      const { rerender } = render(
        <SliderControl
          value={14}
          min={10}
          max={20}
          onChange={handleChange}
          label="Text Size"
          decreaseLabel="Smaller"
          increaseLabel="Larger"
        />
      );
      
      // Click decrease button
      fireEvent.click(screen.getByLabelText('Decrease value'));
      expect(handleChange).toHaveBeenCalledWith(13);
      
      // Update component with the new value (as if parent updated state)
      handleChange.mockClear();
      rerender(
        <SliderControl
          value={13}
          min={10}
          max={20}
          onChange={handleChange}
          label="Text Size"
          decreaseLabel="Smaller"
          increaseLabel="Larger"
        />
      );
      
      // Click increase button
      fireEvent.click(screen.getByLabelText('Increase value'));
      expect(handleChange).toHaveBeenCalledWith(14);
    });
    
    it('should call onClose when Done button is clicked', () => {
      const handleClose = vi.fn();
      
      render(
        <SliderControl
          value={14}
          min={10}
          max={20}
          onChange={vi.fn()}
          onClose={handleClose}
          label="Text Size"
        />
      );
      
      fireEvent.click(screen.getByText('Done'));
      expect(handleClose).toHaveBeenCalled();
    });
    
    it('should reset value when Reset button is clicked', () => {
      const handleChange = vi.fn();
      
      render(
        <SliderControl
          value={14}
          min={10}
          max={20}
          onChange={handleChange}
          label="Text Size"
        />
      );
      
      fireEvent.click(screen.getByText('Reset'));
      expect(handleChange).toHaveBeenCalledWith(15); // Should reset to mid-point between min and max
    });
    
    it('should respect min and max boundaries', async () => {
      const handleChange = vi.fn();
      
      // Test minimum boundary
      const { rerender } = render(
        <SliderControl
          value={10} // At minimum already
          min={10}
          max={20}
          onChange={handleChange}
          label="Text Size"
          decreaseLabel="Smaller"
          increaseLabel="Larger"
        />
      );
      
      // Try to decrease below minimum
      fireEvent.click(screen.getByLabelText('Decrease value'));
      expect(handleChange).toHaveBeenCalledWith(10); // Should stay at min
      
      // Reset mock
      handleChange.mockClear();
      
      // Test maximum boundary
      rerender(
        <SliderControl
          value={20} // At maximum
          min={10}
          max={20}
          onChange={handleChange}
          label="Text Size"
          decreaseLabel="Smaller"
          increaseLabel="Larger"
        />
      );
      
      // Try to increase above maximum
      fireEvent.click(screen.getByLabelText('Increase value'));
      expect(handleChange).toHaveBeenCalledWith(20); // Should stay at max
    });
  });
});