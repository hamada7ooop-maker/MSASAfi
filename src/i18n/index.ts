import { useCallback } from 'react';
import { 
  t as vanillaT, 
  setLang as vanillaSetLang, 
  formatCategoryLabel as vanillaFormatCategoryLabel,
  applyDirection,
  loadLanguage
} from './engine';
import { 
  relDate as vanillaRelDate, 
  getMonthName as vanillaGetMonthName 
} from '../core/utils';
import { useSettingsStore } from '../store/settingsStore';

/**
 * useI18n Hook - Connects React components to the existing translation engine.
 * The `language` from the store is used as a reactive dependency so that
 * all components re-render when the language changes.
 */
export function useI18n() {
  const language = useSettingsStore((s) => s.language);
  const setLangStore = useSettingsStore((s) => s.setLang);

  // t() closes over `language` so React will re-run this whenever language changes
  const t = useCallback((key: string, params?: Record<string, string | number>, fallback?: string) => {
    void language; // reactive dependency - forces re-render on lang change
    return vanillaT(key, params, fallback);
  }, [language]);

  const setLang = useCallback(async (lang: string) => {
    await loadLanguage(lang);
    await vanillaSetLang(lang);
    setLangStore(lang as import('@/types').LanguageCode);
    applyDirection();
  }, [setLangStore]);

  const isRTL = (language === 'ar' || language === 'fa' || language === 'ur');
  const isLTR = !isRTL;

  const formatCategoryLabel = useCallback((name: string) => vanillaFormatCategoryLabel(name), []);
  const relDate = useCallback((date: string | number | Date) => vanillaRelDate(date), []);
  const getMonthName = useCallback((idx: number) => vanillaGetMonthName(idx), []);

  return { t, language, setLang, isRTL, isLTR, formatCategoryLabel, relDate, getMonthName };
}
