import { prefersReducedMotion } from './a11y';

/**
 * Directive 19 — Batch 4: the unified semantic chart theme.
 *
 * Before this module, four chart surfaces each hand-rolled their own look:
 * three different tooltip blacks (rgba(0,0,0,.8) / rgba(15,23,42,.9) /
 * #1e293b), two different greens for income (#10b981 and #22c55e), a dead
 * 'Inter' legend font (the family was removed from the bundle in Batch 1),
 * and gridlines that ranged from "faint" to "hidden" to "nonexistent".
 *
 * This module is the one source every surface reads from:
 * - SEMANTIC      the financial color pair the app speaks (the standard-weight
 *                 kin of the --color-income / --color-expense tokens; the
 *                 HeroBalanceCard glow uses the same family)
 * - glassTooltip  one dark-glass card for every tooltip
 * - faintGrid     x hidden, y whispers, the zero line speaks
 * - axisTicks     one tick voice, the app font
 * - softFill      soft vertical gradient fills for line datasets
 * - chartAnimation  short and gentle; nothing at all under reduced motion
 */

/** The semantic pair: what "money in" and "money out" look like, everywhere. */
export const SEMANTIC = {
  income: '#10b981',  // emerald-500 — kin of --color-income (#34D399)
  expense: '#f43f5e', // rose-500 — kin of --color-expense (#FB7185)
  balance: '#3b82f6', // the app's blue (banking surfaces, neutral series)
  neutral: '#94a3b8', // slate-400 — axis whispers, muted labels
} as const;

/** Investment allocation colors (moved from PortfolioBreakdown's local map). */
export const INVESTMENT_COLORS: Record<string, string> = {
  stocks: '#3b82f6',
  crypto: '#f59e0b',
  real_estate: '#10b981',
  gold: '#fbbf24',
  reit: '#6366f1',
  other: '#8b5cf6',
};

/** The app's one font family (since Batch 1 — IBM Plex Sans Arabic). */
export const CHART_FONT = "'IBM Plex Sans Arabic', sans-serif";

/** One tooltip voice: a dark glass card, on every chart in the app. */
export function glassTooltip(overrides: Record<string, unknown> = {}) {
  return {
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    cornerRadius: 14,
    padding: 12,
    boxPadding: 6,
    titleColor: '#f8fafc',
    bodyColor: '#e2e8f0',
    titleFont: { family: CHART_FONT, size: 13, weight: 'bold' as const },
    bodyFont: { family: CHART_FONT, size: 12 },
    ...overrides,
  };
}

/** One grid voice: faint gridlines, the zero line allowed to speak. */
export function faintGrid(axis: 'x' | 'y' = 'y') {
  if (axis === 'x') return { display: false };
  return {
    color: (context: { tick: { value: number } }) =>
      context.tick.value === 0 ? 'rgba(148, 163, 184, 0.4)' : 'rgba(148, 163, 184, 0.09)',
    lineWidth: (context: { tick: { value: number } }) =>
      context.tick.value === 0 ? 2 : 1,
  };
}

/** One tick voice: the app font, muted slate, tabular enough for money. */
export function axisTicks(size = 10) {
  return {
    font: { family: CHART_FONT, size, weight: 'bold' as const },
    color: 'rgba(148, 163, 184, 0.85)',
  };
}

/**
 * A soft vertical gradient for line fills: `from` alpha at the top of the
 * data area, fading to nothing at the baseline. Pass a canvas context and
 * the chart's plot area (chartArea), as chart.js hands them to scriptable
 * backgroundColor callbacks.
 */
export function softFill(
  ctx: CanvasRenderingContext2D,
  area: { top: number; bottom: number },
  base: string,
  fromAlpha = 0.22
) {
  if (!area) return base;
  const hex = base.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const gradient = ctx.createLinearGradient(0, area.top, 0, area.bottom);
  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${fromAlpha})`);
  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  return gradient;
}

/**
 * One motion rule: short and gentle. False — no animation at all — under
 * prefers-reduced-motion, per the batch-0 motion contract.
 */
export function chartAnimation(duration = 400) {
  return prefersReducedMotion() ? false : { duration };
}
