import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { HeroBalanceCard } from '../../src/features/home/components/dashboard/HeroBalanceCard';
import { prefersReducedMotion } from '../../src/core/a11y';

/**
 * Directive 19 — Batch 1: the hero glass balance card.
 * Pins the inherited a11y contract (aria-live, incognito toggle with
 * aria-pressed and a11y-tree removal) plus the new semantics: the
 * AmbientGlow color follows the net worth sign (approved emerald/coral pair).
 */
vi.mock('../../src/core/a11y', () => ({ prefersReducedMotion: vi.fn(() => false) }));
const reducedMotion = vi.mocked(prefersReducedMotion);

// The card's own counter: snap for deterministic assertions.
vi.mock('../../src/components/ui/NumberFlow', () => ({
  NumberFlow: ({ value, format }: { value: number; format: (v: number) => string }) => (
    <span data-testid="flow">{format(value)}</span>
  ),
}));

function mountCard(props: { balance?: number; prediction?: { daysLeft: number; predictedBalance: number } | null } = {}) {
  return render(
    <HeroBalanceCard
      balance={props.balance ?? 12_500}
      prediction={props.prediction === undefined ? { daysLeft: 12, predictedBalance: 9000 } : props.prediction}
    />
  );
}

beforeEach(() => {
  reducedMotion.mockReturnValue(false);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('HeroBalanceCard — semantic glow (approved pair)', () => {
  it('glows emerald (income color) behind positive net worth', () => {
    mountCard({ balance: 12_500 });
    const style = screen.getByTestId('hero-balance-card').getAttribute('style') || '';
    expect(style).toContain('--glow-color: var(--color-income)');
  });

  it('glows coral (expense color) behind negative net worth', () => {
    mountCard({ balance: -340 });
    const style = screen.getByTestId('hero-balance-card').getAttribute('style') || '';
    expect(style).toContain('--glow-color: var(--color-expense)');
  });

  it('zero counts as positive (emerald)', () => {
    mountCard({ balance: 0 });
    const style = screen.getByTestId('hero-balance-card').getAttribute('style') || '';
    expect(style).toContain('--glow-color: var(--color-income)');
  });
});

describe('HeroBalanceCard — the inherited behavioral contract', () => {
  it('renders the formatted balance through NumberFlow with tabular figures', () => {
    mountCard({ balance: 12_500 });
    expect(screen.getByTestId('flow').textContent).toMatch(/12[.,\u2009\u00a0 ]?500/);
  });

  it('announces balance changes politely (aria-live) and hides digits from the a11y tree', () => {
    mountCard();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveAttribute('aria-live', 'polite');
    expect(heading).toHaveAttribute('aria-atomic', 'true');
    expect(heading.getAttribute('aria-label')).toBeTruthy();
  });

  it('the incognito toggle blurs digits, flips aria-pressed, and re-labels the announcement', () => {
    mountCard();
    // locale-agnostic: find the eye button by its icon ligature
    const eye = screen.getByText('visibility', { selector: 'span' }).closest('button') as HTMLElement;
    expect(eye).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(eye);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(eye).toHaveAttribute('aria-pressed', 'true');
    expect(heading.className).toContain('blur-[12px]');
    // while hidden, the announced label says the balance is concealed
    expect(heading.getAttribute('aria-label')).not.toContain('12');
  });

  it('shows the month pill and the prediction countdown pill', () => {
    mountCard({ prediction: { daysLeft: 12, predictedBalance: 9000 } });
    expect(screen.getByText('calendar_month', { selector: 'span.material-symbols-outlined' })).toBeTruthy();
    expect(screen.getByText('timer', { selector: 'span.material-symbols-outlined' })).toBeTruthy();
    // the countdown figure lives in its own pill ("12 <days-word>"), distinct
    // from the balance "12,500" (comma, no space after 12)
    expect(screen.getByText(/12\s/)).toBeTruthy();
  });

  it('omits the prediction pill when there is no prediction', () => {
    mountCard({ prediction: null });
    expect(screen.queryByText('timer', { exact: false, selector: 'span.material-symbols-outlined' })).not.toBeInTheDocument();
  });

  it('rides the strong glass + ambient glow primitives', () => {
    mountCard();
    const card = screen.getByTestId('hero-balance-card');
    expect(card.className).toContain('glass-panel-strong');
    expect(card.className).toContain('ambient-glow');
  });
});
