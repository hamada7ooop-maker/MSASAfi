import { describe, it, expect } from 'vitest';
import { formatCardNumber, formatExpiry, formatCvv } from '@/features/cards/cardInputFormat';

/**
 * Unit tests for the card input formatters.
 *
 * These rules were previously reachable only by mounting the whole add-card
 * sheet and typing into it, which is why the expiry-clamping edge cases had no
 * coverage at all. Extracting them made the rules directly assertable.
 */

describe('formatCardNumber', () => {
  it('groups digits into blocks of four', () => {
    expect(formatCardNumber('4111111111111111').formatted).toBe('4111 1111 1111 1111');
  });

  it('caps at 16 digits', () => {
    const { cleaned } = formatCardNumber('4111111111111111999');
    expect(cleaned).toHaveLength(16);
  });

  it('strips non-digits the user may paste', () => {
    expect(formatCardNumber('4111-1111 1111.1111').cleaned).toBe('4111111111111111');
  });

  it('accepts Arabic-Indic digits', () => {
    // The app ships an Arabic keyboard layout, so this is a real input path.
    expect(formatCardNumber('٤١١١١١١١١١١١١١١١').cleaned).toBe('4111111111111111');
  });

  it('returns the ungrouped digits separately, for validation', () => {
    const { formatted, cleaned } = formatCardNumber('4111 1111');
    expect(formatted).toBe('4111 1111');
    expect(cleaned).toBe('41111111');
  });
});

describe('formatExpiry', () => {
  it('inserts the slash once two digits are present', () => {
    expect(formatExpiry('1129')).toBe('11/29');
  });

  it('leaves a single digit alone', () => {
    expect(formatExpiry('1')).toBe('1');
  });

  it('clamps a month above 12 down to 12', () => {
    // Typing 1,3 for "13" must not be storable -- it would fail on save with
    // no explanation, so the field corrects as you type.
    expect(formatExpiry('1325')).toBe('12/25');
  });

  it('turns month 00 into 01', () => {
    expect(formatExpiry('0025')).toBe('01/25');
  });

  it('accepts Arabic-Indic digits', () => {
    expect(formatExpiry('١١٢٩')).toBe('11/29');
  });

  it('caps at four digits', () => {
    expect(formatExpiry('112999')).toBe('11/29');
  });
});

describe('formatCvv', () => {
  it('keeps three digits', () => {
    expect(formatCvv('123')).toBe('123');
  });

  it('caps at three digits', () => {
    expect(formatCvv('12345')).toBe('123');
  });

  it('strips letters', () => {
    expect(formatCvv('1a2b3c')).toBe('123');
  });

  it('accepts Arabic-Indic digits', () => {
    expect(formatCvv('١٢٣')).toBe('123');
  });
});
