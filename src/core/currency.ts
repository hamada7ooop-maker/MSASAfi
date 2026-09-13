// ============================================
// مصاريفي — Currency Configuration & Service
// ============================================

import { silentFail } from './errors';
import { db as DB } from './db/core';
import { getApiKey } from './apiKeys';

export interface CurrencyMeta {
  flag: string;
  symbol: string;
  decimals: number;
  region: string;
}

// Comprehensive currency metadata with flags, symbols, and decimals
export const CURRENCIES: Record<string, CurrencyMeta> = {
  // ===== Gulf =====
  SAR: { flag: '🇸🇦', symbol: '﷼', decimals: 2, region: 'gulf' },
  AED: { flag: '🇦🇪', symbol: 'د.إ', decimals: 2, region: 'gulf' },
  QAR: { flag: '🇶🇦', symbol: 'ر.ق', decimals: 2, region: 'gulf' },
  KWD: { flag: '🇰🇼', symbol: 'د.ك', decimals: 3, region: 'gulf' },
  BHD: { flag: '🇧🇭', symbol: 'د.ب', decimals: 3, region: 'gulf' },
  OMR: { flag: '🇴🇲', symbol: 'ر.ع', decimals: 3, region: 'gulf' },
  YER: { flag: '🇾🇪', symbol: 'ر.ي', decimals: 0, region: 'gulf' },
  // ===== North Africa =====
  EGP: { flag: '🇪🇬', symbol: 'ج.م', decimals: 2, region: 'northAfrica' },
  DZD: { flag: '🇩🇿', symbol: 'د.ج', decimals: 2, region: 'northAfrica' },
  MAD: { flag: '🇲🇦', symbol: 'د.م', decimals: 2, region: 'northAfrica' },
  TND: { flag: '🇹🇳', symbol: 'د.ت', decimals: 3, region: 'northAfrica' },
  LYD: { flag: '🇱🇾', symbol: 'د.ل', decimals: 3, region: 'northAfrica' },
  SDG: { flag: '🇸🇩', symbol: 'ج.س', decimals: 2, region: 'northAfrica' },
  // ===== Levant =====
  LBP: { flag: '🇱🇧', symbol: 'ل.ل', decimals: 0, region: 'levant' },
  SYP: { flag: '🇸🇾', symbol: 'ل.س', decimals: 0, region: 'levant' },
  JOD: { flag: '🇯🇴', symbol: 'د.أ', decimals: 3, region: 'levant' },
  IQD: { flag: '🇮🇶', symbol: 'د.ع', decimals: 0, region: 'levant' },
  ILS: { flag: '🇵🇸', symbol: '₪', decimals: 2, region: 'levant' },
  // ===== Americas =====
  USD: { flag: '🇺🇸', symbol: '$', decimals: 2, region: 'americas' },
  CAD: { flag: '🇨🇦', symbol: 'C$', decimals: 2, region: 'americas' },
  MXN: { flag: '🇲🇽', symbol: 'MX$', decimals: 2, region: 'americas' },
  BRL: { flag: '🇧🇷', symbol: 'R$', decimals: 2, region: 'americas' },
  ARS: { flag: '🇦🇷', symbol: 'AR$', decimals: 2, region: 'americas' },
  COP: { flag: '🇨🇴', symbol: 'COP$', decimals: 0, region: 'americas' },
  // ===== Europe =====
  EUR: { flag: '🇪🇺', symbol: '€', decimals: 2, region: 'europe' },
  GBP: { flag: '🇬🇧', symbol: '£', decimals: 2, region: 'europe' },
  CHF: { flag: '🇨🇭', symbol: 'CHF', decimals: 2, region: 'europe' },
  SEK: { flag: '🇸🇪', symbol: 'kr', decimals: 2, region: 'europe' },
  NOK: { flag: '🇳🇴', symbol: 'kr', decimals: 2, region: 'europe' },
  DKK: { flag: '🇩🇰', symbol: 'kr', decimals: 2, region: 'europe' },
  PLN: { flag: '🇵🇱', symbol: 'zł', decimals: 2, region: 'europe' },
  TRY: { flag: '🇹🇷', symbol: '₺', decimals: 2, region: 'europe' },
  // ===== Asia =====
  INR: { flag: '🇮🇳', symbol: '₹', decimals: 2, region: 'asia' },
  PKR: { flag: '🇵🇰', symbol: 'Rs', decimals: 0, region: 'asia' },
  IDR: { flag: '🇮🇩', symbol: 'Rp', decimals: 0, region: 'asia' },
  MYR: { flag: '🇲🇾', symbol: 'RM', decimals: 2, region: 'asia' },
  THB: { flag: '🇹🇭', symbol: '฿', decimals: 2, region: 'asia' },
  JPY: { flag: '🇯🇵', symbol: '¥', decimals: 0, region: 'asia' },
  CNY: { flag: '🇨🇳', symbol: '¥', decimals: 2, region: 'asia' },
  KRW: { flag: '🇰🇷', symbol: '₩', decimals: 0, region: 'asia' },
  SGD: { flag: '🇸🇬', symbol: 'S$', decimals: 2, region: 'asia' },
  HKD: { flag: '🇭🇰', symbol: 'HK$', decimals: 2, region: 'asia' },
  BDT: { flag: '🇧🇩', symbol: '৳', decimals: 2, region: 'asia' },
  LKR: { flag: '🇱🇰', symbol: 'Rs', decimals: 2, region: 'asia' },
  // ===== Oceania =====
  AUD: { flag: '🇦🇺', symbol: 'A$', decimals: 2, region: 'oceania' },
  NZD: { flag: '🇳🇿', symbol: 'NZ$', decimals: 2, region: 'oceania' },
  // ===== Africa =====
  ZAR: { flag: '🇿🇦', symbol: 'R', decimals: 2, region: 'africa' },
  NGN: { flag: '🇳🇬', symbol: '₦', decimals: 2, region: 'africa' },
  KES: { flag: '🇰🇪', symbol: 'KSh', decimals: 2, region: 'africa' },
  // ===== Crypto =====
  BTC: { flag: '₿', symbol: '₿', decimals: 8, region: 'crypto' },
  ETH: { flag: '⟠', symbol: 'ETH', decimals: 6, region: 'crypto' },
  USDT: { flag: '💲', symbol: 'USDT', decimals: 2, region: 'crypto' },
};

export const CURRENCY_REGIONS = ['gulf', 'northAfrica', 'levant', 'americas', 'europe', 'asia', 'oceania', 'africa', 'crypto'];

export let CURRENCY_RATES: Record<string, number> = {
  // Base: USD = 1
  USD: 1,
  // Gulf
  SAR: 3.7508, AED: 3.6725, QAR: 3.64, KWD: 0.307, BHD: 0.377, OMR: 0.385, YER: 250.0,
  // North Africa
  EGP: 48.40, DZD: 133.50, MAD: 9.85, TND: 3.10, LYD: 4.80, SDG: 601.0,
  // Levant
  LBP: 89500, SYP: 13000, JOD: 0.709, IQD: 1310, ILS: 3.73,
  // Americas
  CAD: 1.37, MXN: 17.10, BRL: 5.15, ARS: 880, COP: 3950,
  // Europe
  EUR: 0.935, GBP: 0.805, CHF: 0.91, SEK: 10.85, NOK: 10.95, DKK: 6.98, PLN: 4.02, TRY: 32.50,
  // Asia
  INR: 83.50, PKR: 278.0, IDR: 16200, MYR: 4.78, THB: 36.80, JPY: 154.50, CNY: 7.24, KRW: 1380,
  SGD: 1.36, HKD: 7.83, BDT: 110.0, LKR: 300.0,
  // Oceania / Africa
  AUD: 1.55, NZD: 1.68, ZAR: 19.10, NGN: 1450, KES: 132.0,
  // Crypto (approximate)
  BTC: 0.000015, ETH: 0.00032, USDT: 1.0,
};

export let CRYPTO_CHANGES: Record<string, number> = {
  BTC: 0.54,
  ETH: -1.2,
  USDT: 0.01
};

// Initialize CRYPTO_CHANGES from localStorage if available
try {
  const cached = localStorage.getItem('masarifi_crypto_changes');
  if (cached) {
    CRYPTO_CHANGES = JSON.parse(cached);
  }
} catch (e) {
  silentFail('[Currency] Failed to parse cached crypto changes')(e);
}

export let lastCurrencyUpdate: Date | null = null;

export function setCurrencyRates(rates: Record<string, number>) {
  CURRENCY_RATES = { ...CURRENCY_RATES, ...rates };
}

export async function updateCryptoRates() {
  try {
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether&vs_currencies=usd&include_24hr_change=true';
    const res = await fetch(url);
    if (!res.ok) throw new Error('CoinGecko API Response Not OK');
    const data = await res.json();
    
    if (data.bitcoin && data.ethereum && data.tether) {
      const btcUsd = data.bitcoin.usd;
      const ethUsd = data.ethereum.usd;
      const usdtUsd = data.tether.usd;
      
      CURRENCY_RATES.BTC = btcUsd ? 1 / btcUsd : CURRENCY_RATES.BTC;
      CURRENCY_RATES.ETH = ethUsd ? 1 / ethUsd : CURRENCY_RATES.ETH;
      CURRENCY_RATES.USDT = usdtUsd ? 1 / usdtUsd : CURRENCY_RATES.USDT;
      
      CRYPTO_CHANGES = {
        BTC: data.bitcoin.usd_24h_change || 0,
        ETH: data.ethereum.usd_24h_change || 0,
        USDT: data.tether.usd_24h_change || 0,
      };
      
      localStorage.setItem('masarifi_crypto_changes', JSON.stringify(CRYPTO_CHANGES));
    }
  } catch (e: unknown) {
    silentFail('[Currency] Could not fetch live crypto rates')(e);
  }
}

export async function updateExchangeRates() {
  // Update crypto rates first or in parallel
  await updateCryptoRates();

  try {
    const apiKey = await getApiKey('exchangeRateApiKey');
    
    let url = 'https://open.er-api.com/v6/latest/USD'; // Default free one
    if (apiKey) {
      url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error('API Response Not OK');
    const data = await res.json();
    
    // ExchangeRate-API (v6) uses 'conversion_rates', open.er-api uses 'rates'
    const rates = data?.conversion_rates || data?.rates;
    if (!rates) throw new Error('No Rates Data');
    
    const newRates: Record<string, number> = { USD: 1 };
    for (const code of Object.keys(CURRENCIES)) {
      if (rates[code]) {
        newRates[code] = rates[code];
      }
    }
    CURRENCY_RATES = { ...CURRENCY_RATES, ...newRates };
    lastCurrencyUpdate = new Date();
    await DB.setSetting('lastCurrencyUpdate', lastCurrencyUpdate.toISOString());
  } catch (e: unknown) {
    silentFail('[Currency] Could not fetch live rates')(e);
  }
}

export async function detectUserCurrency() {
  // 100% Offline & Private: Strictly guess user currency based on device locale and timezone, ensuring zero tracking network requests.
  try {
    const locale = navigator.language || 'en-US';
    
    // Map common locales to currencies
    const localeMap: Record<string, string> = {
      'ar-SA': 'SAR', 'ar-AE': 'AED', 'ar-QA': 'QAR', 'ar-KW': 'KWD', 'ar-BH': 'BHD', 'ar-OM': 'OMR', 'ar-YE': 'YER',
      'ar-EG': 'EGP', 'ar-DZ': 'DZD', 'ar-MA': 'MAD', 'ar-TN': 'TND', 'ar-LY': 'LYD', 'ar-SD': 'SDG',
      'ar-LB': 'LBP', 'ar-SY': 'SYP', 'ar-JO': 'JOD', 'ar-IQ': 'IQD',
      'en-US': 'USD', 'en-GB': 'GBP', 'en-CA': 'CAD', 'en-AU': 'AUD', 'en-NZ': 'NZD',
      'fr-FR': 'EUR', 'de-DE': 'EUR', 'it-IT': 'EUR', 'es-ES': 'EUR',
      'tr-TR': 'TRY', 'fa-IR': 'SAR',
      'ms-MY': 'MYR', 'id-ID': 'IDR', 'ur-PK': 'PKR',
    };

    // Try locale exact match
    if (localeMap[locale]) return localeMap[locale];

    // Try language-only match
    const lang = locale.split('-')[0].toLowerCase();
    const langMap: Record<string, string> = {
      ar: 'SAR',
      en: 'USD',
      fr: 'EUR',
      de: 'EUR',
      it: 'EUR',
      es: 'EUR',
      tr: 'TRY',
      ms: 'MYR',
      id: 'IDR',
      ur: 'PKR',
    };
    if (langMap[lang]) return langMap[lang];

    // Try timezone analysis (if Intl is supported)
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) {
        if (tz.includes('Riyadh')) return 'SAR';
        if (tz.includes('Dubai')) return 'AED';
        if (tz.includes('Cairo')) return 'EGP';
        if (tz.includes('Kuwait')) return 'KWD';
        if (tz.includes('Qatar')) return 'QAR';
        if (tz.includes('London')) return 'GBP';
        if (tz.includes('Europe')) return 'EUR';
      }
    }
  } catch (e) {
    silentFail('[Currency] Failed to guess user currency offline')(e);
  }

  return 'SAR'; // Default robust fallback
}
