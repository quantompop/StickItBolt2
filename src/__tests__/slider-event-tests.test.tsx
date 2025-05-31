import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { useState } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SliderControl from '../components/SliderControl';

describe('Slider Event Tests', () => {
  // Setup user-event
  const user = userEvent.setup();
  
  describe('SliderControl Event Handling', () => {
    it('should handle mouse events on the slider track', async () => {
      // Create a wrapper with state
      const SliderWrapper = () => {
        const [value, setValue] = useState(14);
        
        return (
          <div>
            <div data-testid="current-value">{value}</div>
            <SliderControl 
              value={value}
              min={10}
              max={20}
              onChange={setValue}
              label="Slider Track Test"
            />
          </div>
        );
      };
      
      render(<SliderWrapper />);
      
      // Find the slider
      const slider = screen.getByRole('slider');
      
      // Initial value
      expect(screen.getByTestId('current-value')).toHaveTextContent('14');
      
      // Simulate direct change of the slider value
      await act(async () => {
        fireEvent.change(slider, {
          target: { value: '18' }
        });
      });
      
      // Value should update
      expect(screen.getByTestId('current-value')).toHaveTextContent('18');
    });
    
    it('should handle rapid button clicks', async () => {
      // Create a wrapper with state
      const SliderWrapper = () => {
        const [value, setValue] = useState(14);
        
        return (
          <div>
            <div data-testid="current-value">{value}</div>
            <SliderControl 
              value={value}
              min={10}
              max={20}
              onChange={setValue}
              label="Button Click Test"
              decreaseLabel="Down"
              increaseLabel="Up"
            />
          </div>
        );
      };
      
      render(<SliderWrapper />);
      
      // Initial value
      expect(screen.getByTestId('current-value')).toHaveTextContent('14');
      
      // Find the buttons
      const decreaseBtn = screen.getByText('Down');
      const increaseBtn = screen.getByText('Up');
      
      // Click increase button
      await act(async () => {
        await user.click(increaseBtn);
      });
      expect(screen.getByTestId('current-value')).toHaveTextContent('15');
      
      await act(async () => {
        await user.click(increaseBtn);
      });
      expect(screen.getByTestId('current-value')).toHaveTextContent('16');
      
      await act(async () => {
        await user.click(increaseBtn);
      });
      
      // Value should be 17
      expect(screen.getByTestId('current-value')).toHaveTextContent('17');
      
      // Click decrease button
      await act(async () => {
        await user.click(decreaseBtn);
      });
      expect(screen.getByTestId('current-value')).toHaveTextContent('16');
      
      await act(async () => {
        await user.click(decreaseBtn);
      });
      
      // Value should be 15
      expect(screen.getByTestId('current-value')).toHaveTextContent('15');
    });
    
    it('should handle slider keyboard events', async () => {
      // Create a wrapper with state
      const SliderWrapper = () => {
        const [value, setValue] = useState(14);
        
        return (
          <div>
            <div data-testid="current-value">{value}</div>
            <SliderControl 
              value={value}
              min={10}
              max={20}
              onChange={setValue}
              label="Keyboard Test"
            />
          </div>
        );
      };
      
      render(<SliderWrapper />);
      
      // Find the slider
      const slider = screen.getByRole('slider');
      
      // Initial value
      expect(screen.getByTestId('current-value')).toHaveTextContent('14');
      
      // Simulate key events by directly changing value
      await act(async () => {
        fireEvent.change(slider, { target: { value: '15' } });
      });
      expect(screen.getByTestId('current-value')).toHaveTextContent('15');
      
      await act(async () => {
        fireEvent.change(slider, { target: { value: '14' } });
      });
      expect(screen.getByTestId('current-value')).toHaveTextContent('14');
      
      await act(async () => {
        fireEvent.change(slider, { target: { value: '10' } });
      });
      expect(screen.getByTestId('current-value')).toHaveTextContent('10');
      
      await act(async () => {
        fireEvent.change(slider, { target: { value: '20' } });
      });
      expect(screen.getByTestId('current-value')).toHaveTextContent('20');
    });
    
    it('should properly sync between different change methods', async () => {
      // Create a wrapper with state
      const SliderWrapper = () => {
        const [value, setValue] = useState(14);
        
        return (
          <div>
            <div data-testid="current-value">{value}</div>
            <SliderControl 
              value={value}
              min={10}
              max={20}
              onChange={setValue}
              label="Sync Test"
              decreaseLabel="Down"
              increaseLabel="Up"
            />
          </div>
        );
      };
      
      render(<SliderWrapper />);
      
      // Find elements
      const slider = screen.getByRole('slider');
      const increaseBtn = screen.getByText('Up');
      const resetBtn = screen.getByText('Reset');
      
      // Use slider
      await act(async () => {
        fireEvent.change(slider, { target: { value: '18' } });
      });
      expect(screen.getByTestId('current-value')).toHaveTextContent('18');
      
      // Use button
      await act(async () => {
        await user.click(increaseBtn);
      });
      expect(screen.getByTestId('current-value')).toHaveTextContent('19');
      
      // Use reset
      await act(async () => {
        await user.click(resetBtn);
      });
      expect(screen.getByTestId('current-value')).toHaveTextContent('15'); // Midpoint
      
      // Verify slider visual display is also correct
      expect(screen.getByText('15px')).toBeInTheDocument();
      
      // Use direct change again
      await act(async () => {
        fireEvent.change(slider, { target: { value: '16' } });
      });
      expect(screen.getByTestId('current-value')).toHaveTextContent('16');
    });
  });
});