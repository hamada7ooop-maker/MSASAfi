import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateAmount,
  validateText,
  validateDate,
  validateBudgetLimit,
  validateCategoryName,
  validateGoalTarget,
  assertValid,
} from '../../src/core/validation';

describe('Core Input Validation Unit Tests (validation.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateAmount', () => {
    it('accepts valid positive amounts', () => {
      expect(validateAmount(100).ok).toBe(true);
      expect(validateAmount('250.75').ok).toBe(true);
      expect(validateAmount(0.01).ok).toBe(true);
    });

    it('rejects empty, negative, zero, and huge amounts', () => {
      expect(validateAmount(null).ok).toBe(false);
      expect(validateAmount(undefined).ok).toBe(false);
      expect(validateAmount('').ok).toBe(false);
      expect(validateAmount('abc').ok).toBe(false);
      expect(validateAmount(0).ok).toBe(false);
      expect(validateAmount(-50).ok).toBe(false);
      expect(validateAmount(2_000_000_000).ok).toBe(false);
    });
  });

  describe('validateText', () => {
    it('validates text length and required constraint', () => {
      expect(validateText('Grocery Shopping').ok).toBe(true);
      expect(validateText('', { required: false }).ok).toBe(true);
      expect(validateText('', { required: true }).ok).toBe(false);
      expect(validateText('a'.repeat(250), { maxLength: 200 }).ok).toBe(false);
    });
  });

  describe('validateDate', () => {
    it('accepts dates within +/- 10 years range', () => {
      const today = new Date().toISOString().slice(0, 10);
      expect(validateDate(today).ok).toBe(true);
      expect(validateDate('2025-01-01').ok).toBe(true);
    });

    it('rejects invalid or extreme dates', () => {
      expect(validateDate('').ok).toBe(false);
      expect(validateDate('invalid-date').ok).toBe(false);
      expect(validateDate('2050-01-01').ok).toBe(false); // > 10 years
      expect(validateDate('1990-01-01').ok).toBe(false); // < 10 years past
    });
  });

  describe('validateBudgetLimit', () => {
    it('accepts positive limits >= 1', () => {
      expect(validateBudgetLimit(500).ok).toBe(true);
      expect(validateBudgetLimit('1000').ok).toBe(true);
      expect(validateBudgetLimit(0.5).ok).toBe(false);
    });
  });

  describe('validateCategoryName', () => {
    it('accepts safe category names and rejects special chars or empty', () => {
      expect(validateCategoryName('مطاعم ومقاهي').ok).toBe(true);
      expect(validateCategoryName('').ok).toBe(false);
      expect(validateCategoryName('   ').ok).toBe(false);
      expect(validateCategoryName('Cat <script>').ok).toBe(false);
      expect(validateCategoryName('a'.repeat(60)).ok).toBe(false);
    });
  });

  describe('validateGoalTarget and assertValid', () => {
    it('ensures target is greater than already saved amount', () => {
      expect(validateGoalTarget(10000, 5000).ok).toBe(true);
      expect(validateGoalTarget(5000, 5000).ok).toBe(false);
      expect(validateGoalTarget(3000, 5000).ok).toBe(false);
    });

    it('checks assertValid boolean response', () => {
      expect(assertValid({ ok: true })).toBe(true);
      expect(assertValid({ ok: false, error: 'Test Error' })).toBe(false);
    });
  });
});
