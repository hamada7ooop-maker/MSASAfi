import { describe, it, expect } from 'vitest';
import { toIsoDateSafe } from '@/core/utils';

describe('Utility Functions', () => {
  describe('toIsoDateSafe', () => {
    it('should format valid dates to YYYY-MM-DDT...', () => {
      const d = new Date('2023-05-12T10:00:00.000Z');
      expect(toIsoDateSafe(d)).toBe('2023-05-12T10:00:00.000Z');
    });

    it('should return fallback for invalid dates', () => {
      const fallback = 'fallback';
      expect(toIsoDateSafe('not-a-date', fallback)).toBe(fallback);
      expect(toIsoDateSafe(null, fallback)).toBe(fallback);
    });
  });
});
