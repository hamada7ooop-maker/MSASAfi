import { useSettingsStore } from '@store/settingsStore';
import { useAppStore } from '@store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { CURRENCIES } from '@/core/currency';
import { translations } from '@/translations';
import { parseNum, sanitizeNumericInput, sanitizeIntegerInput, sanitizeNameInput } from '@/core/utils';

/**
 * useFormat Hook - Provides formatting utilities for React components.
 */
export function useFormat() {
  const { baseCurrency, decimalPlaces, numberSystem, numberSeparator, currencyDisplayMode } = useSettingsStore(
    useShallow((s) => ({
      baseCurrency: s.baseCurrency,
      decimalPlaces: s.decimalPlaces,
      numberSystem: s.numberSystem,
      numberSeparator: s.numberSeparator,
      currencyDisplayMode: s.currencyDisplayMode
    }))
  );
  const incognito = useAppStore((s) => s.incognito);

  /**
   * Internal formatting logic mirrored from legacy utils
   */
  const _internalFormat = (val: number, decimals: number) => {
    const numberingSystem = numberSystem || 'latn';
    const separator = numberSeparator || 'comma_dot';
    
    const latnMap = {
      'comma_dot': { grp: ',', dec: '.' },
      'dot_comma': { grp: '.', dec: ',' },
      'space_comma': { grp: ' ', dec: ',' },
      'space_dot': { grp: ' ', dec: '.' },
      'none': { grp: '', dec: '.' }
    };
    
    const arabMap = {
      'comma_dot': { grp: '٬', dec: '٫' },
      'dot_comma': { grp: '.', dec: ',' },
      'space_comma': { grp: ' ', dec: '٫' },
      'space_dot': { grp: ' ', dec: '٫' },
      'none': { grp: '', dec: '٫' }
    };

    if (numberingSystem === 'latn') {
       const m = latnMap[separator as keyof typeof latnMap] || latnMap['comma_dot'];
       const [int, dec] = val.toFixed(decimals).split('.');
       const grpInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, m.grp);
       return decimals > 0 ? `${grpInt}${m.dec}${dec}` : grpInt;
    } else if (numberingSystem === 'arab' || numberingSystem === 'hanidec') {
       const m = arabMap[separator as keyof typeof arabMap] || arabMap['comma_dot'];
       const [int, dec] = val.toFixed(decimals).split('.');
       const grpInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, m.grp);
       const raw = decimals > 0 ? `${grpInt}${m.dec}${dec}` : grpInt;
       
       const digits = numberingSystem === 'arab' ? ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'] : ['零','一','二','三','四','五','六','七','八','九'];
       return raw.replace(/\d/g, d => digits[parseInt(d)]);
    }
    return val.toFixed(decimals);
  };

  /**
   * Formats a number according to user settings.
   */
  const fmt = (n: number) => {
    if (incognito) return '•••••';
    // Assume conversion rate is 1 for now or fetch from store
    const val = (n || 0); 
    return _internalFormat(val, decimalPlaces);
  };

  /**
   * Formats a short version of the number.
   */
  const fmtShort = (n: number) => {
    if (incognito) return '•••';
    const val = Math.round(n || 0);
    const raw = val.toString();
    
    if (numberSystem === 'latn') return raw;
    
    const digits = numberSystem === 'arab' ? ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'] : ['零','一','二','三','四','五','六','七','八','九'];
    return raw.replace(/\d/g, d => digits[parseInt(d)]);
  };

  /**
   * Formats a raw number with specific decimals, no currency.
   */
  const fmtRaw = (n: number | string | undefined | null, decimals: number = 2) => {
    const val = typeof n === 'string' ? parseFloat(n) : (n || 0);
    return _internalFormat(val, decimals);
  };

  /**
   * Gets the currency symbol based on settings display mode.
   */
  const getCurrencySymbol = () => {
    const mode = currencyDisplayMode || 'symbol';
    const lang = localStorage.getItem('masarifi_lang') || 'ar';

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
  };

  /**
   * Formats a date string or object nicely.
   */
  const fmtDate = (d: string | Date | number | undefined) => {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    
    const locale = (localStorage.getItem('masarifi_lang') || 'ar') === 'ar' ? 'ar-SA' : 'en-US';
    return date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return { 
    fmt, 
    fmtShort, 
    fmtRaw, 
    getCurrencySymbol, 
    parseNum, 
    fmtDate,
    sanitizeNumericInput,
    sanitizeIntegerInput,
    sanitizeNameInput
  };
}
