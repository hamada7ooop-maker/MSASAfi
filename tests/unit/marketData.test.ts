import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  fetchLiveGoldPrice,
  fetchExchangeRates,
  fetchFinancialNews,
  fetchEconomicIndicators,
  fetchCryptoPrices,
} from '../../src/services/marketData';
import { getApiKey } from '../../src/core/apiKeys';
import { CURRENCY_RATES } from '../../src/core/currency';
import { useSettingsStore } from '../../src/store/settingsStore';

vi.mock('../../src/core/apiKeys', () => ({
  getApiKey: vi.fn(),
}));

const mockGetApiKey = vi.mocked(getApiKey);

/** Route a global fetch mock by URL substring. */
function routeFetch(routes: Array<[string, unknown]>, fallback?: unknown) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    for (const [needle, body] of routes) {
      if (url.includes(needle)) {
        if (body instanceof Error) throw body;
        if (typeof body === 'number') {
          return { ok: false, status: body, json: async () => ({}) } as unknown as Response;
        }
        return { ok: true, status: 200, json: async () => body } as unknown as Response;
      }
    }
    if (fallback instanceof Error) throw fallback;
    if (typeof fallback === 'number') {
      return { ok: false, status: fallback, json: async () => ({}) } as unknown as Response;
    }
    return { ok: true, status: 200, json: async () => fallback } as unknown as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as unknown as Response;
}

describe('Market Data Service Unit Tests (marketData.ts)', () => {
  beforeEach(() => {
    mockGetApiKey.mockReset();
    useSettingsStore.setState({ baseCurrency: 'SAR' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('fetchLiveGoldPrice', () => {
    it('returns null immediately when no gold API key is configured', async () => {
      mockGetApiKey.mockResolvedValue(null);
      const fetchMock = routeFetch([]);
      expect(await fetchLiveGoldPrice()).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(mockGetApiKey).toHaveBeenCalledWith('goldApiKey');
    });

    it('returns the per-gram price directly when the API provides it', async () => {
      mockGetApiKey.mockResolvedValue('gold-key');
      const fetchMock = routeFetch([['/XAU/SAR', { price_gram_24k: 312.5 }]]);
      expect(await fetchLiveGoldPrice()).toBe(312.5);
      expect(String(fetchMock.mock.calls[0][0])).toMatch(/(\/api\/gold|goldapi\.io)\/XAU\/SAR$/);
      const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
      expect(headers['x-access-token']).toBe('gold-key');
    });

    it('converts a per-ounce price to per-gram (31.1035 g/oz)', async () => {
      mockGetApiKey.mockResolvedValue('gold-key');
      routeFetch([['/XAU/USD', { price: 3103.5 }]]);
      useSettingsStore.setState({ baseCurrency: 'USD' });
      expect(await fetchLiveGoldPrice('XAU', 'USD')).toBeCloseTo(99.78, 2);
    });

    it('falls back to USD and converts with internal rates when the primary currency fails', async () => {
      mockGetApiKey.mockResolvedValue('gold-key');
      const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/XAU/SAR')) {
          return jsonResponse({ error: 'unsupported currency' }, false, 400);
        }
        return jsonResponse({ price_gram_24k: 100 });
      });
      vi.stubGlobal('fetch', fetchMock);

      const result = await fetchLiveGoldPrice('XAU', 'SAR');
      expect(result).toBeCloseTo(100 * (CURRENCY_RATES['SAR'] || 1), 5);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('gives up (null) when USD itself fails and no fallback is possible', async () => {
      mockGetApiKey.mockResolvedValue('gold-key');
      routeFetch([['/XAU/USD', 500]]);
      expect(await fetchLiveGoldPrice('XAU', 'USD')).toBeNull();
    });
  });

  describe('fetchExchangeRates', () => {
    it('returns null when no exchange API key is configured', async () => {
      mockGetApiKey.mockResolvedValue(null);
      expect(await fetchExchangeRates()).toBeNull();
    });

    it('returns the conversion rates table for the base currency', async () => {
      mockGetApiKey.mockResolvedValue('fx-key');
      const fetchMock = routeFetch([['exchangerate-api.com/v6/fx-key/latest/SAR', { conversion_rates: { USD: 0.27, EUR: 0.24 } }]]);
      expect(await fetchExchangeRates()).toEqual({ USD: 0.27, EUR: 0.24 });
      expect(String(fetchMock.mock.calls[0][0])).toContain('/latest/SAR');
    });

    it('returns an empty object (not null) when the fetch fails', async () => {
      mockGetApiKey.mockResolvedValue('fx-key');
      routeFetch([], new Error('network down'));
      expect(await fetchExchangeRates()).toEqual({});
    });
  });

  describe('fetchFinancialNews', () => {
    it('returns null when no news API key is configured', async () => {
      mockGetApiKey.mockResolvedValue(null);
      expect(await fetchFinancialNews()).toBeNull();
    });

    it('fetches business news with the encoded API key', async () => {
      mockGetApiKey.mockResolvedValue('news key/&?');
      const fetchMock = routeFetch([
        ['latest-news?category=business&apiKey=news%20key%2F%26%3F', { news: [{ title: 'Markets rally' }] }],
      ]);
      expect(await fetchFinancialNews()).toEqual([{ title: 'Markets rally' }]);
      expect(String(fetchMock.mock.calls[0][0])).toContain('category=business');
    });

    it('returns an empty array when the news API errors', async () => {
      mockGetApiKey.mockResolvedValue('k');
      routeFetch([], 503);
      expect(await fetchFinancialNews()).toEqual([]);
    });
  });

  describe('fetchEconomicIndicators', () => {
    it('returns null when no FRED API key is configured', async () => {
      mockGetApiKey.mockResolvedValue(null);
      expect(await fetchEconomicIndicators()).toBeNull();
    });

    it('maps FRED observations into indicators with relative change, dropping zero series', async () => {
      mockGetApiKey.mockResolvedValue('fred-key');
      const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        const seriesId = url.match(/series_id=([A-Z0-9]+)/)?.[1] ?? '';
        if (seriesId === 'FEDFUNDS') {
          return jsonResponse({
            observations: [
              { value: '5.5', date: '2026-08-01' },
              { value: '5.25', date: '2026-07-01' },
            ],
          });
        }
        if (seriesId === 'GDP') {
          // Latest value is "." (missing) → falls back to the previous pair
          return jsonResponse({
            observations: [
              { value: '.', date: '2026-08-01' },
              { value: '30000', date: '2026-07-01' },
              { value: '29400', date: '2026-06-01' },
            ],
          });
        }
        if (seriesId === 'SP500') {
          return jsonResponse({ observations: [{ value: '0', date: '2026-08-01' }] });
        }
        // Remaining series fail → per-series fallback rows
        return jsonResponse({}, false, 500);
      });
      vi.stubGlobal('fetch', fetchMock);

      const indicators = await fetchEconomicIndicators();
      const ids = indicators?.map((i) => i.id) ?? [];
      expect(ids).toContain('FEDFUNDS');
      expect(ids).toContain('GDP');
      // Zero-valued and failed series are filtered out of the result.
      expect(ids).not.toContain('SP500');
      expect(ids).toHaveLength(2);

      const fed = indicators?.find((i) => i.id === 'FEDFUNDS');
      expect(fed).toMatchObject({ name: 'interestRate', type: 'pct', value: 5.5, date: '2026-08-01' });
      // change is rounded to two decimals via toFixed(2)
      expect(Number(fed?.change)).toBeCloseTo(4.76, 2);
      expect(typeof fed?.change).toBe('string'); // change is reported as a fixed string

      const gdp = indicators?.find((i) => i.id === 'GDP');
      expect(gdp?.value).toBe(30000);
      expect(Number(gdp?.change)).toBeCloseTo(2.04, 2);
    });
  });

  describe('fetchCryptoPrices', () => {
    it('maps the CoinGecko payload to typed crypto prices', async () => {
      routeFetch([
        [
          'coingecko',
          {
            bitcoin: { usd: 65000, sar: 243802, usd_24h_change: 2.5 },
            ethereum: { usd: 2900, sar: 10877, usd_24h_change: -1.2 },
          },
        ],
      ]);
      const prices = await fetchCryptoPrices();
      expect(prices).toHaveLength(2);
      expect(prices[0]).toMatchObject({
        id: 'bitcoin',
        symbol: 'BTC',
        name: 'Bitcoin',
        priceUsd: 65000,
        priceSar: 243802,
        change24h: 2.5,
      });
      expect(prices[1]).toMatchObject({ symbol: 'ETH', name: 'Ethereum', change24h: -1.2 });
    });

    it('upper-cases unknown coin ids as symbols', async () => {
      routeFetch([['coingecko', { dogecoin: { usd: 0.15, sar: 0.56, usd_24h_change: 0 } }]]);
      const prices = await fetchCryptoPrices();
      expect(prices[0]).toMatchObject({ id: 'dogecoin', symbol: 'DOGECOIN', name: 'dogecoin' });
    });

    it('returns an empty array when CoinGecko fails', async () => {
      routeFetch([], new Error('rate limited'));
      expect(await fetchCryptoPrices()).toEqual([]);
    });
  });
});
