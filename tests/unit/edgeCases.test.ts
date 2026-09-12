import { describe, it, expect } from 'vitest';
import { toIsoDateSafe, parseNum, fmtRaw } from '../../src/core/utils';

describe('Boundary & Edge Cases Suite', () => {
  describe('toIsoDateSafe Edge Cases', () => {
    it('handles null, undefined, empty string by falling back safely', () => {
      const customFallback = '2026-08-30T00:00:00.000Z';
      expect(toIsoDateSafe(null, customFallback)).toBe(customFallback);
      expect(toIsoDateSafe(undefined, customFallback)).toBe(customFallback);
      expect(toIsoDateSafe('', customFallback)).toBe(customFallback);
      
      // Default fallback returns a valid ISO string
      const defaultRes = toIsoDateSafe(null);
      expect(typeof defaultRes).toBe('string');
      expect(defaultRes).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('handles garbage/invalid date strings safely without throwing', () => {
      const customFallback = '2026-01-01T00:00:00.000Z';
      expect(toIsoDateSafe('not-a-real-date', customFallback)).toBe(customFallback);
      expect(toIsoDateSafe('invalid_str_123', customFallback)).toBe(customFallback);
      expect(toIsoDateSafe('undefined', customFallback)).toBe(customFallback);
    });

    it('extracts and parses valid ISO date strings correctly', () => {
      const isoInput = '2026-08-30T15:30:00.000Z';
      expect(toIsoDateSafe(isoInput)).toBe(isoInput);
      expect(toIsoDateSafe('2026-05-20')).toMatch(/^2026-05-20/);
    });
  });

  describe('Number Parsing & Formatting Edge Cases', () => {
    it('parseNum handles invalid, NaN, null, and non-numeric inputs', () => {
      expect(parseNum(null)).toBe(0);
      expect(parseNum(undefined)).toBe(0);
      expect(parseNum('abc')).toBe(0);
      expect(parseNum('')).toBe(0);
      expect(parseNum(NaN)).toBe(0);
    });

    it('parseNum correctly parses localized arabic and standard numbers', () => {
      expect(parseNum('1,500.50')).toBe(1500.5);
      expect(parseNum('١٥٠٠')).toBe(1500);
      expect(parseNum('-250.75')).toBe(-250.75);
    });

    it('fmtRaw handles boundary amounts and fallback safely', () => {
      expect(fmtRaw(0)).toBe('0.00');
      expect(fmtRaw(NaN)).toBe('0.00');
      expect(fmtRaw(null)).toBe('0.00');
      expect(fmtRaw(undefined)).toBe('0.00');
      expect(fmtRaw(1234.56)).toBe('1,234.56');
    });

    it('fmtRaw respects custom decimal precision', () => {
      expect(fmtRaw(1234.5678, 0)).toBe('1,235');
      expect(fmtRaw(1234.5, 3)).toBe('1,234.500');
    });
  });
});
