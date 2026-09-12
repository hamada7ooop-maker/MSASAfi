import { describe, it, expect } from 'vitest';
import {
  normalizeArabic,
  ARABIC_SECRET_WORDS,
  ENGLISH_SECRET_WORDS,
  isValidDictionaryWord,
  evaluateWordleGuess,
  getSecretWord
} from '../../src/features/arcade/data/wordleData';

describe('Wordle Data & Logic Engine', () => {
  describe('normalizeArabic', () => {
    it('normalizes hamzas and tatweel correctly', () => {
      expect(normalizeArabic('أَسْهُم')).toContain('ا');
      expect(normalizeArabic('إستثمار')).toBe('استثمار');
      expect(normalizeArabic('آرباح')).toBe('ارباح');
      expect(normalizeArabic('بـنـوك')).toBe('بنوك');
    });
  });

  describe('Secret Words Integrity & Domain Accuracy', () => {
    it('ensures all Arabic secret words have matching lengths and accurate non-empty domains', () => {
      expect(ARABIC_SECRET_WORDS.length).toBeGreaterThanOrEqual(25);

      for (const item of ARABIC_SECRET_WORDS) {
        expect(item.word.length).toBe(item.length);
        expect(item.category).toBeTruthy();
        expect(item.category.trim().length).toBeGreaterThan(3);
        expect(item.categoryEn).toBeTruthy();
      }
    });

    it('verifies explicit requested words and their exact domains', () => {
      const bnook = ARABIC_SECRET_WORDS.find(w => w.word === 'بنوك');
      expect(bnook).toBeDefined();
      expect(bnook?.length).toBe(4);
      expect(bnook?.category).toContain('مصرفي');

      const istithmar = ARABIC_SECRET_WORDS.find(w => w.word === 'استثمار');
      expect(istithmar).toBeDefined();
      expect(istithmar?.length).toBe(7);
      expect(istithmar?.category).toContain('الأموال');

      const bitcoin = ARABIC_SECRET_WORDS.find(w => w.word === 'بيتكوين');
      expect(bitcoin).toBeDefined();
      expect(bitcoin?.length).toBe(7);
      expect(bitcoin?.category).toContain('الرقمية');

      const hisab = ARABIC_SECRET_WORDS.find(w => w.word === 'حساب');
      expect(hisab).toBeDefined();
      expect(hisab?.length).toBe(4);

      const masareef = ARABIC_SECRET_WORDS.find(w => w.word === 'مصاريف');
      expect(masareef).toBeDefined();
      expect(masareef?.length).toBe(6);
    });

    it('ensures all English secret words have matching lengths and non-empty categories', () => {
      for (const item of ENGLISH_SECRET_WORDS) {
        expect(item.word.length).toBe(item.length);
        expect(item.category).toBeTruthy();
        expect(item.categoryEn).toBeTruthy();
      }
    });
  });

  describe('Dictionary Validation (isValidDictionaryWord)', () => {
    it('accepts legitimate Arabic words of matching length', () => {
      // 4-letter words
      expect(isValidDictionaryWord('بنوك', 4, true)).toBe(true);
      expect(isValidDictionaryWord('حساب', 4, true)).toBe(true);
      expect(isValidDictionaryWord('نقود', 4, true)).toBe(true);
      expect(isValidDictionaryWord('راتب', 4, true)).toBe(true);
      expect(isValidDictionaryWord('مصرف', 4, true)).toBe(true);
      expect(isValidDictionaryWord('ريال', 4, true)).toBe(true);
      expect(isValidDictionaryWord('درهم', 4, true)).toBe(true);
      expect(isValidDictionaryWord('كتاب', 4, true)).toBe(true);
      expect(isValidDictionaryWord('سلام', 4, true)).toBe(true);
      expect(isValidDictionaryWord('طريق', 4, true)).toBe(true);

      // 5-letter words
      expect(isValidDictionaryWord('تمويل', 5, true)).toBe(true);
      expect(isValidDictionaryWord('ميزان', 5, true)).toBe(true);
      expect(isValidDictionaryWord('تجارة', 5, true)).toBe(true);
      expect(isValidDictionaryWord('خسارة', 5, true)).toBe(true);
      expect(isValidDictionaryWord('ميزانية', 7, true)).toBe(true);
      expect(isValidDictionaryWord('سيارة', 5, true)).toBe(true);
      expect(isValidDictionaryWord('مدينة', 5, true)).toBe(true);

      // 6 & 7-letter words
      expect(isValidDictionaryWord('مصاريف', 6, true)).toBe(true);
      expect(isValidDictionaryWord('استثمار', 7, true)).toBe(true);
      expect(isValidDictionaryWord('بيتكوين', 7, true)).toBe(true);
      expect(isValidDictionaryWord('اقتصاد', 6, true)).toBe(true);
      expect(isValidDictionaryWord('الشركات', 7, true)).toBe(true);
    });

    it('rejects random gibberish, meaningless letters, and mismatched lengths', () => {
      // Meaningless letters / gibberish / keyboard mash
      expect(isValidDictionaryWord('أبتث', 4, true)).toBe(false);
      expect(isValidDictionaryWord('قثصض', 4, true)).toBe(false);
      expect(isValidDictionaryWord('ضصثق', 4, true)).toBe(false);
      expect(isValidDictionaryWord('شسيب', 4, true)).toBe(false);
      expect(isValidDictionaryWord('طكمن', 4, true)).toBe(false);
      expect(isValidDictionaryWord('سشصضط', 5, true)).toBe(false);
      expect(isValidDictionaryWord('ظظظظظظظ', 7, true)).toBe(false);
      expect(isValidDictionaryWord('شششش', 4, true)).toBe(false);

      // Mismatched lengths
      expect(isValidDictionaryWord('بنوك', 5, true)).toBe(false); // 4 letters in a 5-letter target
      expect(isValidDictionaryWord('استثمار', 6, true)).toBe(false); // 7 letters in a 6-letter target
    });

    it('accepts legitimate English words and rejects gibberish', () => {
      expect(isValidDictionaryWord('BANK', 4, false)).toBe(true);
      expect(isValidDictionaryWord('MONEY', 5, false)).toBe(true);
      expect(isValidDictionaryWord('BUDGET', 6, false)).toBe(true);
      expect(isValidDictionaryWord('FINANCE', 7, false)).toBe(true);

      // Gibberish
      expect(isValidDictionaryWord('XYZW', 4, false)).toBe(false);
      expect(isValidDictionaryWord('QWERT', 5, false)).toBe(false);
      expect(isValidDictionaryWord('ZZZZZZ', 6, false)).toBe(false);
    });
  });

  describe('Wordle Guess Evaluation (evaluateWordleGuess)', () => {
    it('accurately identifies correct, present, and absent letters', () => {
      const secret = 'بنوك';
      const guess = 'بنوك';
      const evaluation = evaluateWordleGuess(guess, secret);
      expect(evaluation).toEqual(['correct', 'correct', 'correct', 'correct']);
    });

    it('handles misplaced letters correctly', () => {
      const secret = 'بنوك';
      const guess = 'كونب';
      const evaluation = evaluateWordleGuess(guess, secret);
      // ك is at pos 0 (in secret at pos 3): present
      // و is at pos 1 (in secret at pos 2): present
      // ن is at pos 2 (in secret at pos 1): present
      // ب is at pos 3 (in secret at pos 0): present
      expect(evaluation).toEqual(['present', 'present', 'present', 'present']);
    });

    it('handles duplicate letters in guess correctly', () => {
      const secret = 'CASH'; // Has one 'A'
      const guess = 'AWAY';  // Has two 'A's
      const evaluation = evaluateWordleGuess(guess, secret);
      // 'A' at pos 0: present (misplaced)
      // 'W': absent
      // 'A' at pos 2: correct ('A' matches secret[1]? No, secret[2] is 'S') -> since count for 'A' was 1, only one 'A' should be yellow/green!
      expect(evaluation[0]).toBe('present');
      expect(evaluation[1]).toBe('absent');
      expect(evaluation[2]).toBe('absent'); // second 'A' should be absent!
      expect(evaluation[3]).toBe('absent');
    });
  });

  describe('getSecretWord (Difficulty & Length)', () => {
    it('returns 4-letter words on easy difficulty', () => {
      for (let i = 0; i < 10; i++) {
        const word = getSecretWord('easy', true);
        expect(word.length).toBe(4);
        expect(word.word.length).toBe(4);
      }
    });

    it('returns 5-letter words on medium difficulty', () => {
      for (let i = 0; i < 10; i++) {
        const word = getSecretWord('medium', true);
        expect(word.length).toBe(5);
        expect(word.word.length).toBe(5);
      }
    });

    it('returns 6 or 7-letter words on hard difficulty', () => {
      for (let i = 0; i < 10; i++) {
        const word = getSecretWord('hard', true);
        expect(word.length).toBeGreaterThanOrEqual(6);
        expect(word.word.length).toBeGreaterThanOrEqual(6);
      }
    });
  });
});
