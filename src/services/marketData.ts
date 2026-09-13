/**
 * Market Data Service
 * Handles fetching live prices for Gold, Silver, and Exchange Rates.
 */

import { getApiKey } from '@/core/apiKeys';
import { useSettingsStore } from '../store/settingsStore';
import { CURRENCY_RATES } from '../core/currency';
import { silentFail, withTimeoutSignal } from '../core/utils';

const GOLD_API_BASE = import.meta.env.DEV ? '/api/gold' : 'https://www.goldapi.io/api';

export interface EconomicIndicator {
  id: string;
  name: string;
  type: string;
  value: number;
  change: string | number;
  date: string;
}

export interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  priceUsd: number;
  priceSar: number;
  change24h: number;
}

export interface NewsArticle {
  id?: string;
  title: string;
  description: string;
  url: string;
  image?: string;
  published?: string;
  category?: string[];
}

/**
 * Fetches live gold price per gram for a specific currency.
 */
export async function fetchLiveGoldPrice(
  symbol = 'XAU',
  currency: string = useSettingsStore.getState().baseCurrency,
  signal?: AbortSignal
): Promise<number | null> {
  const apiKeySetting = await getApiKey('goldApiKey');
  const apiKey = apiKeySetting?.trim();
  if (!apiKey) return null;

  const tryFetch = async (curr: string) => {
    const { signal: combinedSignal, cancel: timeout } = withTimeoutSignal(10000, signal);

    try {
      const response = await fetch(`${GOLD_API_BASE}/${symbol}/${curr}`, {
        headers: {
          'x-access-token': apiKey,
          'Content-Type': 'application/json'
        },
        signal: combinedSignal
      });
      timeout();
      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(`GoldAPI Error ${response.status}: ${err.error || 'Unknown'}`);
      }
      return response.json() as Promise<{ price_gram_24k?: number; price?: number }>;
    } finally {
      timeout();
    }
  };

  try {
    // Try primary currency
    try {
      const data = await tryFetch(currency);
      return data.price_gram_24k || (data.price ? data.price / 31.1035 : null);
    } catch (e: unknown) {
      silentFail(`[MarketData] Gold fetch failed for ${currency}, trying USD fallback`)(e);
      // Fallback to USD
      if (currency !== 'USD') {
        const data = await tryFetch('USD');
        const priceUsd = data.price_gram_24k || (data.price ? data.price / 31.1035 : 0);
        // Convert USD price to target currency using internal rates
        const rate = CURRENCY_RATES[currency] || 1;
        return priceUsd * rate;
      }
      throw e;
    }
  } catch (error) {
    silentFail('[MarketData] Gold Price Final Error')(error);
    return null;
  }
}

/**
 * Fetches live exchange rates from ExchangeRate-API.
 */
export async function fetchExchangeRates(
  base: string = useSettingsStore.getState().baseCurrency,
  signal?: AbortSignal
): Promise<Record<string, number> | null> {
  const apiKey = await getApiKey('exchangeRateApiKey');
  if (!apiKey) {
    return null;
  }

  try {
    const { signal: combinedSignal, cancel: timeout } = withTimeoutSignal(10000, signal);

    const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/${base}`, {
      signal: combinedSignal
    });
    timeout();
    if (!response.ok) throw new Error('Failed to fetch exchange rates');

    const data = (await response.json()) as { conversion_rates?: Record<string, number> };
    return data.conversion_rates || {};
  } catch (error) {
    silentFail('[MarketData] Exchange Rate Fetch Error')(error);
    return {};
  }
}

/**
 * Fetches latest financial news using Currents API.
 */
export async function fetchFinancialNews(signal?: AbortSignal): Promise<NewsArticle[] | null> {
  const apiKey = await getApiKey('currentsApiKey');
  if (!apiKey) return null;

  try {
    const { signal: combinedSignal, cancel: timeout } = withTimeoutSignal(10000, signal);

    const response = await fetch(
      `https://api.currentsapi.services/v1/latest-news?category=business&apiKey=${encodeURIComponent(apiKey)}`,
      { signal: combinedSignal }
    );
    timeout();
    if (!response.ok) {
      const errData = (await response.json().catch(() => ({}))) as { message?: string };
      throw new Error(`News API Error: ${response.status} - ${errData.message || 'Unknown'}`);
    }

    const data = (await response.json()) as { news?: NewsArticle[] };
    return data.news || [];
  } catch (error) {
    silentFail('[MarketData] News Fetch Error')(error);
    return [];
  }
}

export async function fetchEconomicIndicators(signal?: AbortSignal): Promise<EconomicIndicator[] | null> {
  const apiKey = await getApiKey('fredApiKey');
  if (!apiKey) return null;

  const FRED_BASE = import.meta.env.DEV ? '/api/fred' : 'https://api.stlouisfed.org';

  const series = [
    { id: 'FEDFUNDS', name: 'interestRate', type: 'pct' },
    { id: 'CPIAUCSL', name: 'inflation', type: 'pct' },
    { id: 'GDP', name: 'gdp', type: 'pct' },
    { id: 'UNRATE', name: 'unemployment', type: 'pct' },
    { id: 'SP500', name: 'sp500', type: 'val' },
    { id: 'DCOILWTICO', name: 'oil', type: 'val' },
    { id: 'MORTGAGE30US', name: 'mortgage', type: 'pct' },
    { id: 'RSXFS', name: 'retailSales', type: 'val' },
    { id: 'DTWEXBGS', name: 'dollarIndex', type: 'val' },
    { id: 'WALCL', name: 'fedBalance', type: 'val' },
    { id: 'GOLDPMGBD228NLBM', name: 'goldFred', type: 'val' },
    { id: 'T10Y2Y', name: 'yieldCurve', type: 'val' },
    { id: 'GFDEGDQ188S', name: 'usDebtGdp', type: 'pct' }
  ];

  try {
    const results = await Promise.all(
      series.map(async (s) => {
        try {
          const { signal: combinedSignal, cancel: timeout } = withTimeoutSignal(10000, signal);

          const url = `${FRED_BASE}/fred/series/observations?series_id=${s.id}&api_key=${encodeURIComponent(
            apiKey
          )}&file_type=json&limit=2&sort_order=desc`;
          const resp = await fetch(url, { signal: combinedSignal });
          timeout();

          if (!resp.ok) throw new Error(`FRED ${s.id} error: ${resp.status}`);
          const data = (await resp.json()) as { observations?: Array<{ value: string; date: string }> };

          const obs = data.observations || [];
          const latest = obs[0];
          const previous = obs[1];

          let latestVal = parseFloat(latest?.value);
          let previousVal = parseFloat(previous?.value);

          if (Number.isNaN(latestVal)) {
            latestVal = parseFloat(obs[1]?.value);
            previousVal = parseFloat(obs[2]?.value);
          }

          let change = 0;
          if (!Number.isNaN(latestVal) && !Number.isNaN(previousVal) && previousVal !== 0) {
            change = ((latestVal - previousVal) / Math.abs(previousVal)) * 100;
          }

          return {
            id: s.id,
            name: s.name,
            type: s.type,
            value: Number.isNaN(latestVal) ? 0 : latestVal,
            change: Number.isNaN(change) ? 0 : change.toFixed(2),
            date: latest?.date || ''
          };
        } catch (e) {
          silentFail(`[MarketData] Error fetching series ${s.id}`)(e);
          return { id: s.id, name: s.name, type: s.type, value: 0, change: 0, date: '' };
        }
      })
    );
    return results.filter((r) => r.value !== 0);
  } catch (error) {
    silentFail('[MarketData] FRED Fetch Error')(error);
    return [];
  }
}

/**
 * Fetches top crypto prices from CoinGecko.
 */
export async function fetchCryptoPrices(signal?: AbortSignal): Promise<CryptoPrice[]> {
  try {
    const { signal: combinedSignal, cancel: timeout } = withTimeoutSignal(10000, signal);

    const resp = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana,cardano&vs_currencies=usd,sar&include_24hr_change=true',
      { signal: combinedSignal }
    );
    timeout();
    const data = (await resp.json()) as Record<string, { usd: number; sar: number; usd_24h_change: number }>;

    const mapping: Record<string, { symbol: string; name: string }> = {
      bitcoin: { symbol: 'BTC', name: 'Bitcoin' },
      ethereum: { symbol: 'ETH', name: 'Ethereum' },
      binancecoin: { symbol: 'BNB', name: 'BNB' },
      solana: { symbol: 'SOL', name: 'Solana' },
      cardano: { symbol: 'ADA', name: 'Cardano' }
    };

    return Object.keys(data).map((id) => ({
      id,
      symbol: mapping[id]?.symbol || id.toUpperCase(),
      name: mapping[id]?.name || id,
      priceUsd: data[id].usd,
      priceSar: data[id].sar,
      change24h: data[id].usd_24h_change
    }));
  } catch (error) {
    silentFail('[MarketData] Crypto Fetch Error')(error);
    return [];
  }
}
