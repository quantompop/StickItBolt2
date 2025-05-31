import { describe, it, expect, vi } from 'vitest';
import { 
  generateId, 
  getTextColorForBackground, 
  getNoteColorClass, 
  getHoverColorClass 
} from '../helpers';

describe('Helper Functions', () => {
  describe('generateId', () => {
    it('should generate a string id', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
    });

    it('should generate unique ids', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('getTextColorForBackground', () => {
    it('should return dark text for light backgrounds', () => {
      expect(getTextColorForBackground('yellow')).toBe('text-gray-800');
      expect(getTextColorForBackground('pink')).toBe('text-gray-800');
      expect(getTextColorForBackground('orange')).toBe('text-gray-800');
    });

    it('should return light text for dark backgrounds', () => {
      expect(getTextColorForBackground('blue')).toBe('text-white');
      expect(getTextColorForBackground('green')).toBe('text-white');
      expect(getTextColorForBackground('purple')).toBe('text-white');
    });

    it('should return default text color for unknown backgrounds', () => {
      expect(getTextColorForBackground('unknown')).toBe('text-gray-800');
    });
  });

  describe('getNoteColorClass', () => {
    it('should return the correct Tailwind class for each color', () => {
      expect(getNoteColorClass('yellow')).toBe('bg-amber-200');
      expect(getNoteColorClass('blue')).toBe('bg-blue-400');
      expect(getNoteColorClass('green')).toBe('bg-green-400');
      expect(getNoteColorClass('pink')).toBe('bg-pink-300');
      expect(getNoteColorClass('purple')).toBe('bg-purple-400');
      expect(getNoteColorClass('orange')).toBe('bg-orange-300');
    });

    it('should return default color class for unknown colors', () => {
      expect(getNoteColorClass('unknown')).toBe('bg-amber-200');
    });
  });

  describe('getHoverColorClass', () => {
    it('should return the correct hover class for each color', () => {
      expect(getHoverColorClass('yellow')).toBe('hover:bg-amber-300');
      expect(getHoverColorClass('blue')).toBe('hover:bg-blue-500');
      expect(getHoverColorClass('green')).toBe('hover:bg-green-500');
      expect(getHoverColorClass('pink')).toBe('hover:bg-pink-400');
      expect(getHoverColorClass('purple')).toBe('hover:bg-purple-500');
      expect(getHoverColorClass('orange')).toBe('hover:bg-orange-400');
    });

    it('should return default hover class for unknown colors', () => {
      expect(getHoverColorClass('unknown')).toBe('hover:bg-amber-300');
    });
  });
});