import { describe, it, expect } from 'vitest';
import { setLang, t, isAppLTR } from '@/i18n/engine';
import { useSettingsStore } from '@/store/settingsStore';

describe('i18n Localization', () => {
  it('should switch language and return proper translation', async () => {
    await setLang('en');
    expect(useSettingsStore.getState().language).toBe('en');
    expect(isAppLTR()).toBe(true);
    
    await setLang('ar');
    expect(useSettingsStore.getState().language).toBe('ar');
    expect(isAppLTR()).toBe(false);
    
    // Testing Arabic — use 'app.name' which exists in translations.js
    expect(t('app.name')).toBe('مصاريفي');
  });

  it('should fallback to key if translation missing', () => {
    expect(t('some.missing.key')).toBe('some.missing.key');
  });

  it('should interpolate variables in auth.pin.progress properly', async () => {
    await setLang('ar');
    expect(t('auth.pin.progress', { entered: 2, total: 4 })).toBe('أدخلت 2 من 4 أرقام');
    expect(t('auth.biometric')).toBe('المصادقة البيومترية');
    expect(t('settings.pinPad')).toBe('لوحة مفاتيح PIN');

    await setLang('en');
    const { loadLanguage } = await import('@/i18n/engine');
    await loadLanguage('en');
    expect(t('auth.pin.progress', { entered: 3, total: 4 })).toBe('Entered 3 of 4 digits');
    expect(t('auth.biometric')).toBe('Biometric Authentication');
    expect(t('settings.pinPad')).toBe('PIN Keypad');
  });
});
