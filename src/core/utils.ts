import { useSettingsStore } from '../store/settingsStore';
import { useAppStore } from '../store/appStore';
import DOMPurify from 'dompurify';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { bridge } from './AppBridge';
import { CURRENCIES, CURRENCY_RATES } from './currency';
import { translations } from '../translations.js';
export const $ = (sel: string): HTMLElement | null => document.querySelector(sel);
export const $$ = (sel: string): NodeListOf<HTMLElement> => document.querySelectorAll(sel);
export const sanitize = (html: string): string => DOMPurify.sanitize(html);

import { silentFail, ignore } from './errors';
export { silentFail, ignore };

function getSettings() {
  try {
    return useSettingsStore.getState();
  } catch (_) {
    return { baseCurrency: 'SAR', language: 'ar', numberSystem: 'latn', decimalPlaces: 2, numberSeparator: 'comma_dot', currencyDisplayMode: 'symbol', incognito: false };
  }
}

function getAppState() {
  try {
    return useAppStore.getState();
  } catch (_) {
    return { incognito: false };
  }
}

/**
 * Fallback for t() to avoid circular dependency in utils
 */
function _t(key: string, params: Record<string, string | number> = {}): string {
  try {
    const res = bridge.t?.(key, params as Record<string, string>);
    if (typeof res === 'string') return res;
  } catch (_) {
    // Fallback below
  }
  return key;
}

export function getCurrencySymbol(): string {
  const settings = getSettings();
  const baseCurrency = settings.baseCurrency || 'SAR';
  const mode = settings.currencyDisplayMode || 'symbol';
  const lang = localStorage.getItem('masarifi_lang') || settings.language || 'ar';

  const transMap = translations as unknown as Record<string, Record<string, string>>;
  switch (mode) {
    case 'code':
      return baseCurrency;

    case 'nameAr':
      return transMap.ar?.[`currency.name.${baseCurrency}`] || baseCurrency;

    case 'nameEn':
      return transMap.en?.[`currency.name.${baseCurrency}`] || baseCurrency;

    case 'local': {
      const isRtl = lang === 'ar' || lang === 'fa' || lang === 'ur';
      if (baseCurrency === 'SAR') {
        return isRtl ? 'ر.س' : 'SR';
      }
      if (baseCurrency === 'AED') {
        return isRtl ? 'د.إ' : 'AED';
      }
      if (baseCurrency === 'EGP') {
        return isRtl ? 'ج.م' : 'EGP';
      }
      return CURRENCIES[baseCurrency]?.symbol || baseCurrency;
    }

    case 'symbol':
    default: {
      if (baseCurrency === 'SAR') {
        const isRtl = lang === 'ar' || lang === 'fa' || lang === 'ur';
        return isRtl ? 'ر.س' : 'SR';
      }
      return CURRENCIES[baseCurrency]?.symbol || baseCurrency;
    }
  }
}

export function getCurrencyHtml(): string {
  if (getSettings().baseCurrency === 'SAR') {
    return `<svg style="display:inline-block; height:1em; width:auto; fill:currentColor; vertical-align:-0.125em;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1124 1256"><path d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"/><path d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"/></svg>`;
  }
  return getCurrencySymbol();
}

export function sanitizeChatMarkdown(text: string | null | undefined): string {
  if (text == null || text === '') return '';
  let escaped = escapeHtml(String(text));
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  const hasMore = escaped.includes('[MORE_INFO]');
  escaped = escaped.replace(/\[MORE_INFO\]/g, ''); // Strip the tag
  
  let html = String(DOMPurify.sanitize(escaped, { ALLOWED_TAGS: ['strong', 'br', 'div', 'span'], ADD_ATTR: ['class'] }));
  
  if (hasMore) {
     html += `<div class="mt-4"><button aria-label="send chat continue" data-action="send-chat-continue" class="bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-300 px-4 py-2.5 rounded-xl text-xs font-black active:scale-95 transition-all flex items-center gap-2 border border-blue-200/50 dark:border-blue-800/30 w-full justify-center"><span class="material-symbols-outlined text-base pointer-events-none">read_more</span><span class="pointer-events-none">${_t('action.continue')}</span></button></div>`;
  }
  
  return html;
}

export const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function toIsoDateSafe(input: unknown, fallback = new Date().toISOString()): string {
  if (!input || typeof input !== 'string' && typeof input !== 'number' && !(input instanceof Date)) return fallback;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toISOString();
}

export const AVAILABLE_ICONS: readonly string[] = [
  'shopping_bag','restaurant','directions_car','home','shopping_cart','movie','health_and_safety',
  'school','subscriptions','receipt_long','redeem','payments','swap_horiz','trending_up','more_horiz',
  'flight','fitness_center','pets','child_care','local_cafe','local_bar','local_laundry_service',
  'local_gas_station','local_hospital','local_library','local_parking','checkroom','diamond','cloud',
  'wallet','attach_money','credit_card','currency_exchange','storefront','emoji_events','mosque','favorite',
  'work','build','brush','camera_alt','headphones','sports_soccer','sports_esports',
] as const;

// Reusable icon picker UI component
export function renderIconPicker(selectedIcon: string, actionName = 'pick-icon', inputId = 'picked-icon'): string {
  return `
    <div class="grid grid-cols-8 gap-2 my-2 max-h-32 overflow-y-auto">
      ${AVAILABLE_ICONS.map((ic) => `
        <button aria-label="${actionName}" data-action="${actionName}" data-icon="${ic}" data-target="${inputId}" class="global-icon-pick p-1 rounded-xl flex items-center justify-center transition-all ${ic === selectedIcon ? 'bg-[#002b59] text-white' : 'bg-slate-50 dark:bg-[#2a2d30] text-slate-500 hover:bg-blue-50'}">
          <span class="material-symbols-outlined text-lg" aria-hidden="true">${ic}</span>
        </button>`).join('')}
    </div>
    <input id="${inputId}" type="hidden" value="${selectedIcon || AVAILABLE_ICONS[0]}"/>
  `;
}

export function renderAccountSelector(
  selectedId: string | undefined,
  idAttr: string,
  accounts: Array<{ id: string; name: string }> = []
): string {
  return `
    <div class="bg-slate-50 dark:bg-[#2a2d30] p-3 rounded-xl my-2">
      <label class="text-[10px] text-slate-500 block mb-1">${_t('utils.linkedAccount')}</label>
      <select id="${idAttr}" class="bg-transparent border-none w-full text-sm font-bold focus:outline-none dark:text-white appearance-none">
        <option value="">${_t('utils.noneOption')}</option>
        ${accounts.map(acc => `<option value="${acc.id}" ${acc.id === selectedId ? 'selected' : ''}>${acc.name}</option>`).join('')}
      </select>
    </div>
  `;
}

/**
 * Get the conversion rate from the internal Pivot Currency (SAR) to the user's selected Base Currency.
 * Everything in DB is normalized to SAR.
 */
export function getConversionRate(): number { 
  const baseCurrency = getSettings().baseCurrency || 'SAR';
  return CURRENCY_RATES[baseCurrency] || 1; 
}

/**
 * Normalizes Eastern Arabic-Indic and Persian digits to standard Western digits (0-9).
 */
export function normalizeArabicDigits(str: unknown): string {
  if (str === null || str === undefined || str === '') return '';
  const digitMap: Record<string, string> = {
    '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
    '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9'
  };
  return String(str).replace(/[٠-٩۰-۹]/g, (d) => digitMap[d] || d);
}

/**
 * Parses a string into a number, handling Arabic/Persian digits and various decimal separators.
 */
export function parseNum(str: unknown): number {
  if (str === null || str === undefined || str === '') return 0;
  if (typeof str === 'number') return Number.isNaN(str) ? 0 : str;
  let s = normalizeArabicDigits(String(str).trim());
  
  // 2. Normalize Arabic decimal separator (٫) to dot
  s = s.replace(/٫/g, '.');
  
  // 3. Handle European/Common decimal separators (comma vs dot)
  if (s.includes(',') && !s.includes('.')) {
    s = s.replace(/,/g, '.');
  } else if (s.includes(',') && s.includes('.')) {
    s = s.replace(/,/g, '');
  }
  
  // 4. Remove any remaining non-numeric characters except first dot and minus sign
  s = s.replace(/[^\d.-]/g, '');
  
  // 5. Handle multiple dots (keep only the first one)
  const parts = s.split('.');
  if (parts.length > 2) {
    s = parts[0] + '.' + parts.slice(1).join('');
  }
  
  const val = parseFloat(s);
  return Number.isNaN(val) ? 0 : val;
}

/**
 * Sanitizes numeric input in real time.
 * - Normalizes Eastern Arabic-Indic (٠-٩) and Persian (۰-۹) numerals to ASCII digits (0-9).
 * - Converts Arabic comma (،) and decimal separator (٫) to dot (.).
 * - If allowDecimal is true, allows at most one dot (.).
 * - If allowNegative is true, allows at most one leading minus (-).
 * - Strips all letters (Arabic, Latin, etc.), spaces, symbols, and any non-numeric characters.
 */
export function sanitizeNumericInput(val: unknown, allowDecimal = true, allowNegative = false): string {
  if (val === null || val === undefined) return '';
  let s = normalizeArabicDigits(String(val));
  // Remove Arabic thousands separator
  s = s.replace(/٬/g, '');
  // Normalize Arabic decimal separator (٫) to dot
  s = s.replace(/٫/g, '.');

  // If both comma and dot exist, comma is thousands separator
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/,/g, '');
  } else if (s.includes(',')) {
    s = s.replace(/[،,]/g, '.');
  } else {
    s = s.replace(/،/g, '.');
  }

  let result = '';
  let hasDot = false;
  let hasMinus = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch >= '0' && ch <= '9') {
      result += ch;
    } else if (allowDecimal && ch === '.' && !hasDot) {
      result += '.';
      hasDot = true;
    } else if (allowNegative && ch === '-' && result.length === 0 && !hasMinus) {
      result += '-';
      hasMinus = true;
    }
  }

  return result;
}

/**
 * Sanitizes integer input (strictly digits only, e.g. age, count).
 */
export function sanitizeIntegerInput(val: unknown, allowNegative = false): string {
  return sanitizeNumericInput(val, false, allowNegative);
}

/**
 * Sanitizes name/text input to reject numeric digits (both 0-9 and Eastern Arabic/Persian digits).
 */
export function sanitizeNameInput(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).replace(/[0-9٠-٩۰-۹]/g, '');
}

function _internalFormat(val: number, decimals: number): string {
  const settings = getSettings();
  const numberingSystem = settings.numberSystem || 'latn';
  const separator = settings.numberSeparator || 'comma_dot';
  
  const latnMap: Record<string, { grp: string; dec: string }> = {
    'comma_dot': { grp: ',', dec: '.' },
    'dot_comma': { grp: '.', dec: ',' },
    'space_comma': { grp: ' ', dec: ',' },
    'space_dot': { grp: ' ', dec: '.' },
    'none': { grp: '', dec: '.' }
  };
  
  const arabMap: Record<string, { grp: string; dec: string }> = {
    'comma_dot': { grp: '٬', dec: '٫' },
    'dot_comma': { grp: '.', dec: ',' },
    'space_comma': { grp: ' ', dec: '٫' },
    'space_dot': { grp: ' ', dec: '٫' },
    'none': { grp: '', dec: '٫' }
  };

  if (numberingSystem === 'latn' || !numberingSystem) {
     const m = latnMap[separator] || latnMap['comma_dot'];
     const [int, dec] = val.toFixed(decimals).split('.');
     const grpInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, m.grp);
     return decimals > 0 && dec !== undefined ? `${grpInt}${m.dec}${dec}` : grpInt;
  } else if (numberingSystem === 'arab' || numberingSystem === 'hanidec') {
     const m = arabMap[separator] || arabMap['comma_dot'];
     const [int, dec] = val.toFixed(decimals).split('.');
     const grpInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, m.grp);
     const raw = decimals > 0 && dec !== undefined ? `${grpInt}${m.dec}${dec}` : grpInt;
     
     const digits = numberingSystem === 'arab' ? ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'] : ['零','一','二','三','四','五','六','七','八','九'];
     return raw.replace(/\d/g, (d) => digits[parseInt(d)] || d);
  }
  return val.toFixed(decimals);
}

export function fmt(n: number | null | undefined): string {
  const isIncog = getAppState().incognito || getSettings().incognito;
  if (isIncog) return '•••••';
  const val = (n || 0) * getConversionRate();
  const decimals = getSettings().decimalPlaces ?? 2;
  return _internalFormat(val, decimals);
}

export function fmtRaw(n: number | null | undefined, decimals = (getSettings().decimalPlaces ?? 2)): string {
  return _internalFormat(n || 0, decimals);
}

export function fmtShort(n: number | null | undefined): string {
  const isIncog = getAppState().incognito || getSettings().incognito;
  if (isIncog) return '•••';
  const val = (n || 0) * getConversionRate();
  const numberingSystem = getSettings().numberSystem || 'latn';
  
  const raw = Math.round(val).toString();
  
  if (numberingSystem === 'latn') return raw;
  
  const digits = numberingSystem === 'arab' ? ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'] : ['零','一','二','三','四','五','六','七','八','九'];
  return raw.replace(/\d/g, (d) => digits[parseInt(d)] || d);
}

export function fmtCompact(n: number | null | undefined): string {
  const isIncog = getAppState().incognito || getSettings().incognito;
  if (isIncog) return '•••';
  const val = (n || 0) * getConversionRate();
  const lang = getSettings().language || 'ar';
  const locale = (lang === 'ar' ? 'ar-SA' : lang === 'fa' ? 'fa-IR' : lang === 'ur' ? 'ur-PK' : `${lang}-${lang.toUpperCase()}`);
  const numberingSystem = getSettings().numberSystem || 'latn';
  return val.toLocaleString(locale, { numberingSystem, notation: 'compact', maximumFractionDigits: 1 });
}

export function relDate(d: string | number | Date | null | undefined): string {
  if (!d) return '';
  const date = new Date(d);
  const now = new Date();
  
  const d1 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.floor(diffTime / 86400000);
  
  if (diffDays === 0) return _t('misc.today');
  if (diffDays === 1) return _t('misc.yesterday');
  if (diffDays > 1 && diffDays < 7) return _t('misc.daysAgo', { n: diffDays.toString() });
  if (diffDays < 0) return _t('misc.future');
  
  const lang = getSettings().language || 'ar';
  const locale = (lang === 'ar' ? 'ar-SA' : lang === 'fa' ? 'fa-IR' : lang === 'ur' ? 'ur-PK' : `${lang}-${lang.toUpperCase()}`);
  return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function getMonthName(idx: number): string {
  return _t(`misc.month.${idx}`);
}

export function emptyState(
  icon: string,
  title: string,
  subtitle: string,
  action: { onclick: string; text: string } | null = null
): string {
  return `
    <div class="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div class="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
        <span class="material-symbols-outlined text-4xl text-slate-400" aria-hidden="true">${icon}</span>
      </div>
      <h3 class="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">${title}</h3>
      <p class="text-sm text-on-surface-variant mb-6 max-w-xs">${subtitle}</p>
      ${action ? `<button aria-label="${action.onclick}" onclick="${action.onclick}" class="bg-[#002b59] text-white px-6 py-3 rounded-xl font-bold">${action.text}</button>` : ''}
    </div>
  `;
}

export function createProgressRing(pct: number, color: string, sizeClass = 'w-14 h-14', strokeWidth = 3): string {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(pct, 100) / 100) * circumference;
  return `<div class="relative ${sizeClass} flex items-center justify-center shrink-0">
    <svg class="w-full h-full transform -rotate-90" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="${radius}" fill="none" stroke="currentColor" class="text-slate-100 dark:text-slate-700 opacity-50" stroke-width="${strokeWidth}"></circle>
      <circle cx="20" cy="20" r="${radius}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round" class="transition-all duration-1000 ease-out"></circle>
    </svg>
    <div class="absolute inset-0 flex items-center justify-center"><span class="text-xs font-bold" style="color:${color}">${Math.round(pct)}%</span></div>
  </div>`;
}

export function debounce<T extends (...args: never[]) => void>(fn: T, ms = 250): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// Data Cache
export const _cache: { data: Record<string, unknown>; ts: Record<string, number> } = { data: {}, ts: {} };

export function cached<T>(key: string, fn: () => Promise<T>, ttl = 5000): () => Promise<T> {
  return async function (): Promise<T> {
    const now = Date.now();
    if (_cache.data[key] !== undefined && now - (_cache.ts[key] || 0) < ttl) {
      return _cache.data[key] as T;
    }
    const result = await fn();
    _cache.data[key] = result;
    _cache.ts[key] = now;
    return result;
  };
}

export function invalidateCache(key?: string): void { 
  if (key) { 
    delete _cache.data[key]; 
    delete _cache.ts[key]; 
  } else { 
    _cache.data = {}; 
    _cache.ts = {}; 
  } 
}

/**
 * Compresses an image Base64 string or Blob
 */
export async function compressImage(source: string | Blob, maxWidth = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = typeof source === 'string' ? source : URL.createObjectURL(source);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.height > 0 ? canvas.getContext('2d') : null;
      if (!ctx) return reject(new Error('Canvas context error'));
      
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl);
    };
    img.onerror = (e) => reject(e);
  });
}

// ==============================
// Filesystem Image Management
// ==============================
export async function saveImageToFS(base64Data?: string | null): Promise<string | null | undefined> {
  if (!base64Data || !base64Data.startsWith('data:image')) return base64Data;
  if (!Capacitor.isNativePlatform()) return base64Data;
  
  try {
    const fileName = `txn_img_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
    const data = base64Data.split(',')[1];
    await Filesystem.writeFile({
      path: fileName,
      data: data,
      directory: Directory.Data
    });
    return fileName;
  } catch (err) {
    silentFail('Filesystem write error')(err);
    return base64Data;
  }
}

export async function loadImageFromFS(fileName?: string | null): Promise<string | null> {
  if (!fileName) return null;
  if (fileName.startsWith('data:image')) return fileName;
  if (!Capacitor.isNativePlatform()) return '';
  
  try {
    const uriResult = await Filesystem.getUri({
      directory: Directory.Data,
      path: fileName
    });
    return Capacitor.convertFileSrc(uriResult.uri);
  } catch (err) {
    silentFail('Filesystem read error')(err);
    return null;
  }
}

/**
 * Combines an optional caller-supplied AbortSignal with a timeout signal.
 *
 * The previous pattern across the codebase was:
 *
 *   const controller = new AbortController();
 *   setTimeout(() => controller.abort(), 10000);
 *   const signal = callerSignal || controller.signal;   // ← bug
 *
 * When the caller passed a signal, the timeout controller was discarded, so
 * the timeout never applied and the request could hang indefinitely.
 *
 * Returns the combined signal plus a `cancel()` to clear the pending timer.
 */
export function withTimeoutSignal(
  timeoutMs: number,
  callerSignal?: AbortSignal | null
): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const cancel = () => clearTimeout(timer);

  if (!callerSignal) return { signal: controller.signal, cancel };

  // Prefer the native combinator when available.
  const anyFn = (AbortSignal as unknown as {
    any?: (signals: AbortSignal[]) => AbortSignal;
  }).any;
  if (typeof anyFn === 'function') {
    return { signal: anyFn([callerSignal, controller.signal]), cancel };
  }

  // Fallback: mirror the caller's abort onto our controller.
  if (callerSignal.aborted) {
    controller.abort();
  } else {
    callerSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return { signal: controller.signal, cancel };
}
