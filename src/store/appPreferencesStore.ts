import { useSettingsStore } from './settingsStore';
import { useShallow } from 'zustand/react/shallow';
import type { AppSettings, LanguageCode } from '@/types';

export interface AppPreferencesState {
  language: LanguageCode;
  theme: AppSettings['theme'];
  baseCurrency: string;
  numberSystem: 'latn' | 'arab';
  decimalPlaces: AppSettings['decimalPlaces'];
  numberSeparator: AppSettings['numberSeparator'];
  fontSize: AppSettings['fontSize'];
  currencyDisplayMode: AppSettings['currencyDisplayMode'];
  incognito: boolean;
  dbEncryption: boolean;
  useBiometric: boolean;
  darkPalette: string;
  lightPalette: string;
  setLang: (l: LanguageCode) => void;
  setTheme: (t: AppSettings['theme']) => void;
  setBaseCurrency: (c: string) => void;
  setNumberSystem: (s: 'latn' | 'arab') => void;
  setDecimalPlaces: (n: AppSettings['decimalPlaces']) => void;
  setNumberSeparator: (s: AppSettings['numberSeparator']) => void;
  setCurrencyDisplayMode: (m: AppSettings['currencyDisplayMode']) => void;
  setIncognito: (v: boolean) => void;
  setDbEncryption: (v: boolean) => void;
  setDarkPalette: (p: string) => void;
  setLightPalette: (p: string) => void;
  setUseBiometric: (v: boolean) => void;
  setFontSize: (s: AppSettings['fontSize']) => void;
}

function getAppPreferencesSlice(store = useSettingsStore.getState()): AppPreferencesState {
  return {
    language: store.language as LanguageCode,
    theme: store.theme,
    baseCurrency: store.baseCurrency,
    numberSystem: store.numberSystem,
    decimalPlaces: store.decimalPlaces,
    numberSeparator: store.numberSeparator,
    fontSize: store.fontSize,
    currencyDisplayMode: store.currencyDisplayMode,
    incognito: store.incognito,
    dbEncryption: store.dbEncryption,
    useBiometric: store.useBiometric,
    darkPalette: store.darkPalette,
    lightPalette: store.lightPalette,
    setLang: store.setLang,
    setTheme: store.setTheme,
    setBaseCurrency: store.setBaseCurrency,
    setNumberSystem: store.setNumberSystem,
    setDecimalPlaces: store.setDecimalPlaces,
    setNumberSeparator: store.setNumberSeparator,
    setCurrencyDisplayMode: store.setCurrencyDisplayMode,
    setIncognito: store.setIncognito,
    setDbEncryption: store.setDbEncryption,
    setDarkPalette: store.setDarkPalette,
    setLightPalette: store.setLightPalette,
    setUseBiometric: store.setUseBiometric,
    setFontSize: store.setFontSize,
  };
}

export function useAppPreferencesStore(): AppPreferencesState;
export function useAppPreferencesStore<T>(selector: (state: AppPreferencesState) => T): T;
export function useAppPreferencesStore<T>(selector?: (state: AppPreferencesState) => T) {
  // useShallow keeps the snapshot referentially stable — without it the
  // no-selector overload returns a fresh object every render and trips
  // useSyncExternalStore into an infinite re-render loop.
  return useSettingsStore(
    useShallow((store) => {
    const slice = getAppPreferencesSlice(store);
    return selector ? selector(slice) : slice;
  })
  );
}

useAppPreferencesStore.getState = getAppPreferencesSlice;
