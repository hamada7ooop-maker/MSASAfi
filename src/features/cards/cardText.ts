import { LOCAL_TEXTS, COUNTRY_NAMES } from './data/cardConstants';

/**
 * Dictionary lookups for the cards feature.
 *
 * The cards screens carry their own `LOCAL_TEXTS` table rather than using the
 * app-wide i18n engine, so every component in the feature re-declared the same
 * two closures. Extracted from AddCardModal.tsx during the L-1 split so the
 * fallback chain — active language, then English, then the raw key — is
 * defined once.
 *
 * Returning the key itself as a last resort is deliberate: a missing string
 * shows up as a visible token in the UI rather than as an empty element, which
 * makes it obvious in review instead of invisible.
 */
export function makeCardText(language: string) {
  const getTxt = (key: string): string => {
    const dict = LOCAL_TEXTS[language] || LOCAL_TEXTS['en'];
    return dict[key] || LOCAL_TEXTS['en'][key] || key;
  };

  const getCountryName = (countryId: string): string =>
    COUNTRY_NAMES[countryId]?.[language] || COUNTRY_NAMES[countryId]?.['en'] || countryId;

  return { getTxt, getCountryName };
}
