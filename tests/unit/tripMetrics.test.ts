/**
 * Directive 19 — decomposition continuation: unit tests for the pure
 * primitives extracted from TravelBudget. The screen's rendered figures are
 * pinned by travelBudget.test.tsx (written before the first extraction);
 * these pin the arithmetic and the vocabulary mapping themselves.
 */
import { describe, it, expect } from 'vitest';
import { tripSpendMetrics } from '../../src/features/budgets/utils/tripMetrics';
import { extractCountry, getWeatherInfo } from '../../src/features/budgets/utils/travelWeather';
import type { Trip, Transaction } from '../../src/types';

const TRIP = (over: Partial<Trip> = {}): Trip => ({
  id: 't1',
  name: 'باريس',
  currency: 'EUR',
  limit: 2000,
  exchangeRate: 4,
  startDate: '2026-03-01',
  endDate: '2026-03-10',
  isActive: true,
  ...over,
});

const TX = (amount: number): Transaction =>
  ({ id: String(amount), amount, date: '2026-03-02', description: 'x', type: 'expense' }) as unknown as Transaction;

describe('tripSpendMetrics — the cross-currency reconciliation', () => {
  it('converts the foreign budget forward and the spending back', () => {
    // 3,000 SAR of spending against a 2,000 EUR budget at rate 4:
    // limit → 8,000 SAR, spending → 750 EUR, 37.5% consumed.
    const m = tripSpendMetrics(TRIP(), [TX(1000), TX(2000)]);
    expect(m.spentPrimary).toBe(3000);
    expect(m.spentForeign).toBe(750);
    expect(m.limitPrimary).toBe(8000);
    expect(m.pct).toBe(37.5);
    expect(m.isWarning).toBe(false);
    expect(m.isDanger).toBe(false);
  });

  it('the 85% band warns, 100% is danger, and pct is clamped at 100', () => {
    const warn = tripSpendMetrics(TRIP(), [TX(6900)]); // 6900/8000 = 86.25%
    expect(warn.isWarning).toBe(true);
    expect(warn.isDanger).toBe(false);

    const danger = tripSpendMetrics(TRIP(), [TX(8000)]); // exactly 100%
    expect(danger.isWarning).toBe(false);
    expect(danger.isDanger).toBe(true);

    const over = tripSpendMetrics(TRIP(), [TX(20000)]); // 250% → clamped
    expect(over.pct).toBe(100);
    expect(over.isDanger).toBe(true);
  });

  it('a zero or unparsable rate degrades to identity, not division by zero', () => {
    const m = tripSpendMetrics(TRIP({ exchangeRate: 0 }), [TX(1000)]);
    expect(m.spentForeign).toBe(1000); // 1000 / 1 — the || 1 guard
    expect(m.limitPrimary).toBe(2000); // the SAME guard applies forward: 2000 × 1
    expect(m.pct).toBe(50); // 1000 / 2000 — identity rate, not a crash
  });

  it('an unparseable amount counts as 0', () => {
    const m = tripSpendMetrics(TRIP(), [TX(Number('x'))]);
    expect(m.spentPrimary).toBe(0);
  });
});

describe('extractCountry — Arabic/English trip names → geocoding queries', () => {
  it('maps the bilingual vocabulary to English country names', () => {
    expect(extractCountry('رحلة إلى باريس')).toBe('France');
    expect(extractCountry('london trip')).toBe('United Kingdom');
    expect(extractCountry('أسبوع في دبي')).toBe('United Arab Emirates');
    expect(extractCountry('Japan سفر')).toBe('Japan');
    expect(extractCountry('الرياض الصيف')).toBe('Saudi Arabia');
    expect(extractCountry('اسطنبول')).toBe('Turkey');
  });

  it('an unrecognized name is stripped of travel filler and kept', () => {
    expect(extractCountry('رحلة إلى نيوزيلندا')).toBe('نيوزيلندا');
  });
});

describe('getWeatherInfo — Open-Meteo codes → icon/label/gradient', () => {
  const t = (key: string) => key; // identity: assert the KEY, not a translation

  it('covers the documented bands', () => {
    expect(getWeatherInfo(0, t).icon).toBe('wb_sunny');
    expect(getWeatherInfo(2, t).icon).toBe('partly_cloudy_day');
    expect(getWeatherInfo(46, t).icon).toBe('foggy');
    expect(getWeatherInfo(60, t).icon).toBe('rainy');
    expect(getWeatherInfo(73, t).icon).toBe('ac_unit');
    expect(getWeatherInfo(81, t).icon).toBe('rainy_heavy');
    expect(getWeatherInfo(96, t).icon).toBe('thunderstorm');
  });

  it('anything outside the documented bands reads as moderate weather', () => {
    // 4 sits between the clear (0) and partial-cloud (1–3) bands; 99 is
    // already thunderstorm territory (≥95), so it is NOT the unknown case.
    const m = getWeatherInfo(4, t);
    expect(m.icon).toBe('device_thermostat');
    expect(m.text).toContain('travel.weather.moderate');
  });
});
