import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { PulseStrip } from '../../src/features/home/components/dashboard/PulseStrip';
import { CURRENCIES } from '../../src/core/currency';
import { useSettingsStore } from '../../src/store/settingsStore';

/**
 * Directive 19 — Batch 1: the unified market strip.
 * One chassis, four kinds. Pins: cell rendering per kind, the graceful
 * fallback set when an API key is absent (inherited from the classic
 * widgets), the currency strip's base-currency derivation, and the
 * accessibility group semantics.
 */

describe('PulseStrip — the unified chassis', () => {
  it('renders the kind rail with an accessible group role', () => {
    render(<PulseStrip kind="economic" economic={[]} />);
    const strip = screen.getByTestId('pulse-strip-economic');
    expect(strip).toHaveAttribute('role', 'group');
    expect(strip.getAttribute('aria-label')).toBeTruthy();
  });

  it('economic: renders live indicators as compact cells with signed change', () => {
    render(
      <PulseStrip
        kind="economic"
        economic={[{ id: 'gdp', value: 3.1, change: 0.4, type: 'pct' }, { id: 'oil', value: 78.5, change: -0.85, type: 'num' }]}
      />
    );
    const cells = screen.getAllByTestId('pulse-cell');
    expect(cells.length).toBe(2);
    expect(screen.getByText('▲')).toBeTruthy();
    expect(screen.getByText('▼')).toBeTruthy();
    // the numeric change with its sign color semantics
    const up = screen.getByText('0.4%');
    expect(up.style.color).toBe('var(--color-income)');
    const down = screen.getByText('0.85%');
    expect(down.style.color).toBe('var(--color-expense)');
  });

  it('economic: falls back to the standard indicator set when data is missing', () => {
    render(<PulseStrip kind="economic" economic="missing" />);
    expect(screen.getAllByTestId('pulse-cell').length).toBe(8);
  });

  it('crypto: renders symbol, price, and 24h change per coin', () => {
    render(
      <PulseStrip
        kind="crypto"
        crypto={[{ id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', priceUsd: 64500, change24h: 2.45 }]}
      />
    );
    expect(screen.getByText('BTC')).toBeTruthy();
    expect(screen.getByText(/64,?500/)).toBeTruthy();
    expect(screen.getByText('2.45%')).toBeTruthy();
  });

  it('crypto: falls back to the standard coin set when data is missing', () => {
    render(<PulseStrip kind="crypto" crypto={null} />);
    expect(screen.getAllByTestId('pulse-cell').length).toBe(5);
  });

  it('news: renders headline links with source and safe external rel', () => {
    render(
      <PulseStrip
        kind="news"
        news={[{ id: '1', title: 'الأسواق تستقر', source: 'رويترز', url: 'https://example.com/a' }]}
      />
    );
    const link = screen.getByTestId('pulse-cell');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', 'https://example.com/a');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText(/الأسواق تستقر/)).toBeTruthy();
  });

  it('currency: derives major rates relative to the base currency', () => {
    useSettingsStore.setState({ baseCurrency: 'SAR' });
    const { container } = render(<PulseStrip kind="currency" />);
    const cells = container.querySelectorAll('[data-testid="pulse-cell"]');
    expect(cells.length).toBeGreaterThan(3);
    // the base currency itself must not be listed
    const texts = Array.from(cells).map((c) => c.textContent || '');
    expect(texts.some((t) => t.includes(`SAR/SAR`))).toBe(false);
    // majors are present with the CURRENCIES registry's flags
    expect(texts.some((t) => t.includes('USD'))).toBe(true);
    expect(texts.join(' ')).toContain(CURRENCIES['USD']?.flag || '🌐');
  });
});
