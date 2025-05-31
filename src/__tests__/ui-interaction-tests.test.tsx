import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SliderControl from '../components/SliderControl';

describe('UI Interaction Tests', () => {
  // Setup user-event for more realistic interactions
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SliderControl Interaction Tests', () => {
    // Create a wrapper component to test slider state properly
    const SliderTestComponent = () => {
      const [value, setValue] = useState(14);
      
      return (
        <div>
          <div data-testid="current-value">{value}</div>
          <SliderControl
            value={value}
            min={10}
            max={20}
            step={1}
            onChange={setValue}
            label="Test Slider"
            decreaseLabel="Decrease"
            increaseLabel="Increase"
          />
        </div>
      );
    };
    
    it('should update value when slider is moved', async () => {
      render(<SliderTestComponent />);
      
      // Get the initial value
      expect(screen.getByTestId('current-value')).toHaveTextContent('14');
      
      // Find the slider and change its value
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: 16 } });
      
      // Check if the value was updated
      expect(screen.getByTestId('current-value')).toHaveTextContent('16');
    });
    
    it('should update value when increase button is clicked', async () => {
      render(<SliderTestComponent />);
      
      // Get the initial value
      expect(screen.getByTestId('current-value')).toHaveTextContent('14');
      
      // Click the increase button
      await user.click(screen.getByLabelText('Increase value'));
      
      // Check if the value was updated
      expect(screen.getByTestId('current-value')).toHaveTextContent('15');
    });
    
    it('should update value when decrease button is clicked', async () => {
      render(<SliderTestComponent />);
      
      // Get the initial value
      expect(screen.getByTestId('current-value')).toHaveTextContent('14');
      
      // Click the decrease button
      await user.click(screen.getByLabelText('Decrease value'));
      
      // Check if the value was updated
      expect(screen.getByTestId('current-value')).toHaveTextContent('13');
    });
    
    it('should update value when Reset button is clicked', async () => {
      render(<SliderTestComponent />);
      
      // Get the initial value
      expect(screen.getByTestId('current-value')).toHaveTextContent('14');
      
      // Click the reset button
      await user.click(screen.getByText('Reset'));
      
      // Should reset to middle value (15)
      expect(screen.getByTestId('current-value')).toHaveTextContent('15');
    });
  });
});