import { useCallback } from 'react';
import { useI18n } from '../../../i18n/index';
import { LOCAL_TEXTS, COUNTRY_NAMES } from '../data/cardConstants';

/**
 * Directive 19 — Batch 3: the card screen's local text lookup, extracted from
 * the 553-line manager so every deck piece can speak for itself.
 *
 * Same resolution order as before, verbatim: the active language's dict,
 * then the English dict, then the key itself — so an extraction cannot change
 * what a missing key renders as.
 */
export function useCardText() {
  const { language } = useI18n();

  const getTxt = useCallback((key: string): string => {
    const dict = LOCAL_TEXTS[language] || LOCAL_TEXTS['en'];
    return dict[key] || LOCAL_TEXTS['en'][key] || key;
  }, [language]);

  const getCountryName = useCallback(
    (cId: string): string => COUNTRY_NAMES[cId]?.[language] || COUNTRY_NAMES[cId]?.['en'] || cId,
    [language]
  );

  return { getTxt, getCountryName };
}
