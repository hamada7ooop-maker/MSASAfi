import { SettingsRepository } from '../db/repositories/settings';
import { useSettingsStore } from '../../store/settingsStore';
import { changeLanguage } from '../../i18n/engine';

/**
 * SettingsService - High-level logic for managing application settings.
 * Bridges Repositories and Zustand Store (Single Source of Truth).
 */
export const SettingsService = {
  
  /**
   * Updates a setting in DB and Zustand store.
   */
  async updateSetting(key: string, value: unknown) {
    // 1. Persist to IndexedDB
    await SettingsRepository.set(key, value);

    // 2. Special Side Effects (Load resources before notifying UI)
    if (key === 'language' && typeof value === 'string') {
      await changeLanguage(value);
    }

    // 3. Sync with Zustand Store (Single Source of Truth)
    const store = useSettingsStore.getState();
    type SetterFn = (val: never) => unknown;
    const storeSetterMap: Record<string, SetterFn> = {
      language: store.setLang as SetterFn,
      theme: store.setTheme as SetterFn,
      darkPalette: store.setDarkPalette as SetterFn,
      lightPalette: store.setLightPalette as SetterFn,
      baseCurrency: store.setBaseCurrency as SetterFn,
      numberSystem: store.setNumberSystem as SetterFn,
      decimalPlaces: store.setDecimalPlaces as SetterFn,
      numberSeparator: store.setNumberSeparator as SetterFn,
      currencyDisplayMode: store.setCurrencyDisplayMode as SetterFn,
      incognito: store.setIncognito as SetterFn,
      dbEncryption: store.setDbEncryption as SetterFn,
      useBiometric: store.setUseBiometric as SetterFn,
      fontSize: store.setFontSize as SetterFn,
      firstDayOfMonth: store.setFirstDayOfMonth as SetterFn,
      firstDayOfWeek: store.setFirstDayOfWeek as SetterFn,
      aiResponseLength: store.setAiResponseLength as SetterFn,
      hourlyRate: store.setHourlyRate as SetterFn,
      isWorkHoursEnabled: store.setIsWorkHoursEnabled as SetterFn,
      salaryBasic: store.setSalaryBasic as SetterFn,
      salaryAllowances: store.setSalaryAllowances as SetterFn,
      salaryDeductions: store.setSalaryDeductions as SetterFn,
      
      // Next-Gen UI / Pro Features
    };

    const setter = storeSetterMap[key];
    if (setter) {
      (setter as (val: unknown) => void)(value);
    }
  },

  /**
   * Loads all settings into the Zustand store on startup.
   */
  async initializeStore() {
    const all = await SettingsRepository.getAll();
    
    // Iteratively update the store with any values found in DB
    Object.entries(all).forEach(([key, value]) => {
       this.updateSetting(key, value);
    });
  }
};
