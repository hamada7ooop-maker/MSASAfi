import { registerToBridge } from '../core/AppBridge';
import { useSettingsStore } from '../store/settingsStore';
import { silentFail } from '../core/errors';
import type { LanguageCode } from '../types/language';
export type { LanguageCode };

export interface LanguageMetaItem {
  name: string;
  flag: string;
  dir: 'rtl' | 'ltr';
  font: string;
}

export const LANGUAGE_META: Record<LanguageCode, LanguageMetaItem> = {
  ar: { name: 'العربية', flag: '🇸🇦', dir: 'rtl', font: "'Tajawal', 'IBM Plex Sans Arabic', sans-serif" },
  en: { name: 'English', flag: '🇺🇸', dir: 'ltr', font: 'sans-serif' },
  fr: { name: 'Français', flag: '🇫🇷', dir: 'ltr', font: 'sans-serif' },
  tr: { name: 'Türkçe', flag: '🇹🇷', dir: 'ltr', font: 'sans-serif' },
  ur: { name: 'اردو', flag: '🇵🇰', dir: 'rtl', font: "'Tajawal', 'IBM Plex Sans Arabic', sans-serif" },
  ms: { name: 'Bahasa Melayu', flag: '🇲🇾', dir: 'ltr', font: 'sans-serif' },
  id: { name: 'Bahasa Indonesia', flag: '🇮🇩', dir: 'ltr', font: 'sans-serif' },
  fa: { name: 'فارسی', flag: '🇮🇷', dir: 'rtl', font: "'Tajawal', 'IBM Plex Sans Arabic', sans-serif" },
  es: { name: 'Español', flag: '🇪🇸', dir: 'ltr', font: 'sans-serif' },
  de: { name: 'Deutsch', flag: '🇩🇪', dir: 'ltr', font: 'sans-serif' },
  it: { name: 'Italiano', flag: '🇮🇹', dir: 'ltr', font: 'sans-serif' },
};

export function getLang(): LanguageCode { 
  try {
    const storeLang = useSettingsStore.getState().language;
    if (storeLang && storeLang in LANGUAGE_META) {
      return storeLang as LanguageCode;
    }
  } catch {
    // Fallback if accessed before store hydration
  }
  return 'ar'; 
}

export function setLang(l: LanguageCode | string): void { 
  const normalized = (l in LANGUAGE_META ? l : 'ar') as LanguageCode;
  try {
    if (useSettingsStore.getState().language !== normalized) {
      useSettingsStore.getState().setLang(normalized);
    }
  } catch {
    // Ignore store sync errors
  }
}

/**
 * Every language, Arabic included, is fetched on demand.
 *
 * Arabic used to be imported statically from ../translations.js. Because it is
 * also the last-resort fallback in t(), that static import forced ~296 KB of
 * Arabic strings into the eagerly preloaded startup chunk for every user — an
 * English speaker paid for the whole Arabic dictionary before the first paint.
 * Loading it through the same dynamic path as the others lets Rollup split it
 * into its own chunk, so each user downloads one language.
 */
const LOCALE_LOADERS: Record<LanguageCode, () => Promise<Record<string, unknown>>> = {
  ar: () => import('../locales/ar.js'),
  en: () => import('../locales/en.js'),
  fr: () => import('../locales/fr.js'),
  tr: () => import('../locales/tr.js'),
  ur: () => import('../locales/ur.js'),
  ms: () => import('../locales/ms.js'),
  id: () => import('../locales/id.js'),
  fa: () => import('../locales/fa.js'),
  es: () => import('../locales/es.js'),
  de: () => import('../locales/de.js'),
  it: () => import('../locales/it.js')
};

/**
 * The live translation registry. Starts empty and is filled by loadLanguage().
 * Exported through getLoadedTranslations() for the few call sites that need to
 * read another language's table directly (currency names, settings search).
 */
const trans: Record<string, Record<string, string>> = {};

/** In-flight loads, so concurrent callers share one network/parse pass. */
const inFlight = new Map<string, Promise<void>>();

export function getLoadedTranslations(): Record<string, Record<string, string>> {
  return trans;
}

/** True once the language's strings are resident and t() can resolve them. */
export function isLanguageLoaded(lang: string): boolean {
  return Boolean(trans[lang]);
}

export async function loadLanguage(targetLang: string): Promise<void> {
  if (trans[targetLang]) return;

  const loader = LOCALE_LOADERS[targetLang as LanguageCode];
  if (!loader) return;

  const existing = inFlight.get(targetLang);
  if (existing) return existing;

  const task = (async () => {
    try {
      const module = await loader();
      // Support both default and named exports (locale_xx)
      const localeData = (module.default ||
        module[`locale_${targetLang}`] ||
        Object.values(module)[0]) as Record<string, string>;
      trans[targetLang] = localeData;
    } catch (e) {
      silentFail(`[i18n] Failed to load locale: ${targetLang}`)(e);
    } finally {
      inFlight.delete(targetLang);
    }
  })();

  inFlight.set(targetLang, task);
  return task;
}

/**
 * Ensure the strings needed to render are resident — the user's language, and
 * nothing else.
 *
 * t() keeps an English-then-Arabic fallback chain, but those are a runtime
 * safety net, not something to preload: every shipped locale is verified at
 * 100% coverage of the Arabic key set (scripts/i18n-sync.mjs, and
 * tests/unit/i18nLazyLoading.test.ts), so the chain never actually resolves a
 * key. Eagerly loading a fallback would mean every user downloading and
 * parsing a SECOND full dictionary — ~224 KB for Arabic, ~168 KB for English —
 * that is never read. That was precisely the L-4 defect.
 *
 * If a key ever does go missing the chain degrades to the key name, and the
 * coverage test fails long before that reaches a user.
 */
export async function ensureFallbackLoaded(lang?: string): Promise<void> {
  await loadLanguage(lang ?? getLang());
}

export function t(key: string, params: Record<string, string | number> = {}, fallback?: string): string {
  const L = getLang();
  let text = trans[L]?.[key] ?? trans.en?.[key] ?? trans.ar?.[key];
  if (text === undefined) {
    text = fallback !== undefined ? fallback : key;
  }
  for (const [k, v] of Object.entries(params)) {
    text = String(text).replaceAll(`{${k}}`, String(v));
  }
  return text;
}

// Attach t to AppBridge for utils fallback
registerToBridge('t', t);

export function formatHomeOrderLabel(item?: { labelKey?: string; labelAr?: string; labelEn?: string; id?: string } | null): string {
  if (!item) return '';
  if (item.labelKey) return t(item.labelKey);
  const ltr = (LANGUAGE_META[getLang()]?.dir || 'rtl') === 'ltr';
  return ltr ? (item.labelEn || item.labelAr || item.id || '') : (item.labelAr || item.labelEn || item.id || '');
}

const DB_CAT_TO_KEY: Record<string, string> = {
  'مواد غذائية': 'category.groceries',
  'مطاعم': 'category.dining',
  'مواصلات': 'category.transport',
  'سكن': 'category.housing',
  'تسوق': 'category.shopping',
  'ترفيه': 'category.entertainment',
  'صحة': 'category.health',
  'تعليم': 'category.education',
  'اشتراكات': 'category.subscriptions',
  'فواتير': 'category.bills',
  'راتب': 'category.salary',
  'تحويل': 'category.transfer',
  'هدايا': 'category.gifts',
  'استثمار': 'category.investment',
  'ديون': 'category.debts',
  'أخرى': 'category.other',
};

export function formatCategoryLabel(name?: string): string {
  if (!name) return '';
  if (name === 'family_shared' || name === 'مصاريف مشتركة') return t('family.txnCategory');
  
  // 1. Try direct translation (for keys like 'category.groceries')
  const direct = t(name);
  if (direct !== name) return direct;

  // 2. Try mapping (for legacy Arabic names in DB)
  if (DB_CAT_TO_KEY[name]) {
    const keyMatch = t(DB_CAT_TO_KEY[name]);
    if (keyMatch !== DB_CAT_TO_KEY[name]) return keyMatch;
  }
  
  return name;
}

const LEGACY_PAYMENT_TO_ID: Record<string, string> = {
  '💳 بطاقة': 'card',
  '💵 نقد': 'cash',
  '📱 Apple Pay': 'apple_pay',
  '🔄 تحويل': 'transfer',
};

export function formatPaymentMethod(pm?: string): string {
  if (!pm) return '';
  const id = LEGACY_PAYMENT_TO_ID[pm] || pm;
  const key = `txn.pay.${id}`;
  const out = t(key);
  return out !== key ? out : pm;
}

const INTL_LOCALE_BY_LANG: Record<string, string> = {
  ar: 'ar-SA', en: 'en-US', fr: 'fr-FR', tr: 'tr-TR', ur: 'ur-PK',
  ms: 'ms-MY', id: 'id-ID', fa: 'fa-IR', es: 'es-ES', de: 'de-DE', it: 'it-IT',
};

export function getIntlLocale(): string {
  return INTL_LOCALE_BY_LANG[getLang()] || 'en-US';
}

export function isAppLTR(): boolean {
  return (LANGUAGE_META[getLang()]?.dir || 'rtl') === 'ltr';
}

export function isAppRTL(): boolean {
  return !isAppLTR();
}

export function formatCurrencyName(code: string): string {
  return t(`currency.name.${code}`);
}

export function formatRegionName(regionKey: string): string {
  return t(`misc.region.${regionKey}`);
}

export async function initLanguage(): Promise<void> {
  const { db: DB } = await import('../core/db/core');
  const saved = (await DB.getSetting('language')) as string | undefined;
  if (saved) {
    await ensureFallbackLoaded(saved);
    setLang(saved);
  } else {
    // 100% Offline & Private: Guess language based on device locale settings, avoiding external network requests.
    const nav = navigator as Navigator & { userLanguage?: string };
    const deviceLang = (nav.language || nav.userLanguage || 'en').split('-')[0].toLowerCase();

    const supported = Object.keys(LANGUAGE_META);
    const targetLang = supported.includes(deviceLang) ? deviceLang : 'en';
    await ensureFallbackLoaded(targetLang);
    setLang(targetLang);
  }
  applyDirection();
}

export function applyDirection(): void {
  const currentLang = getLang();
  const meta = LANGUAGE_META[currentLang] || LANGUAGE_META['ar'];
  document.documentElement.dir = meta.dir;
  document.documentElement.lang = currentLang;
  document.body.style.fontFamily = meta.font;
  const offlineEl = document.getElementById('offline-banner-text');
  if (offlineEl) offlineEl.textContent = t('offline.banner');
}

export async function changeLanguage(newLang: string): Promise<void> {
  await ensureFallbackLoaded(newLang);
  setLang(newLang);
  const { db: DB } = await import('../core/db/core');
  await DB.setSetting('language', newLang);
  applyDirection();
}
