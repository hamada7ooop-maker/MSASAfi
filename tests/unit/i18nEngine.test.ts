import { describe, it, expect, beforeEach } from 'vitest';
import {
  t,
  getLang,
  setLang,
  changeLanguage,
  initLanguage,
  isAppLTR,
  isAppRTL,
  getIntlLocale,
  formatCategoryLabel,
  formatPaymentMethod,
  formatCurrencyName,
  formatRegionName,
  formatHomeOrderLabel,
} from '../../src/i18n/engine';
import { useSettingsStore } from '../../src/store/settingsStore';
import { db as DB } from '../../src/core/db/core';

describe('i18n Engine Unit Tests (engine.ts)', () => {
  beforeEach(async () => {
    useSettingsStore.setState({ language: 'ar' });
    await DB.settings.clear();
  });

  describe('Translation & Interpolation', () => {
    it('translates existing keys and replaces parameters', () => {
      const text = t('action.buyAmount', { n: 50 });
      expect(text).toContain('50');
    });

    it('falls back to key if translation is missing', () => {
      expect(t('non_existent_key_xyz')).toBe('non_existent_key_xyz');
    });
  });

  describe('Language Management & Direction', () => {
    it('detects RTL and LTR correctly based on current language', () => {
      setLang('ar');
      expect(isAppRTL()).toBe(true);
      expect(isAppLTR()).toBe(false);
      expect(getIntlLocale()).toBe('ar-SA');

      setLang('en');
      expect(isAppRTL()).toBe(false);
      expect(isAppLTR()).toBe(true);
      expect(getIntlLocale()).toBe('en-US');
    });

    it('changes language and applies document direction', async () => {
      await changeLanguage('en');
      expect(getLang()).toBe('en');
      expect(document.documentElement.dir).toBe('ltr');
      expect(document.documentElement.lang).toBe('en');

      await changeLanguage('ar');
      expect(getLang()).toBe('ar');
      expect(document.documentElement.dir).toBe('rtl');
      expect(document.documentElement.lang).toBe('ar');
    });

    it('initializes language from DB setting or fallback', async () => {
      await DB.setSetting('language', 'fr');
      await initLanguage();
      expect(getLang()).toBe('fr');
    });
  });

  describe('Formatters', () => {
    it('formats category names and legacy DB categories', () => {
      expect(formatCategoryLabel('مطاعم')).toBeDefined();
      expect(formatCategoryLabel('category.groceries')).toBeDefined();
      expect(formatCategoryLabel('family_shared')).toBeDefined();
      expect(formatCategoryLabel('')).toBe('');
    });

    it('formats payment methods', () => {
      expect(formatPaymentMethod('💳 بطاقة')).toBeDefined();
      expect(formatPaymentMethod('cash')).toBeDefined();
      expect(formatPaymentMethod('')).toBe('');
    });

    it('formats currency and region names', () => {
      expect(formatCurrencyName('SAR')).toBeDefined();
      expect(formatRegionName('middle_east')).toBeDefined();
    });

    it('formats home order label for RTL and LTR', () => {
      setLang('ar');
      expect(formatHomeOrderLabel({ labelAr: 'البطاقات', labelEn: 'Cards' })).toBe('البطاقات');

      setLang('en');
      expect(formatHomeOrderLabel({ labelAr: 'البطاقات', labelEn: 'Cards' })).toBe('Cards');
      expect(formatHomeOrderLabel(null)).toBe('');
    });
  });
});
