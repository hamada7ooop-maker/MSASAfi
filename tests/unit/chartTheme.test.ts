/**
 * Directive 19 — Batch 4: the unified chart theme module.
 *
 * Pins the semantic pair, the glass tooltip card, the faint grid voice,
 * the soft gradient math, and the reduced-motion animation gate.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/core/a11y', () => ({
  prefersReducedMotion: vi.fn(() => false),
}));

const { prefersReducedMotion } = await import('../../src/core/a11y');
const {
  SEMANTIC,
  INVESTMENT_COLORS,
  CHART_FONT,
  glassTooltip,
  faintGrid,
  axisTicks,
  softFill,
  chartAnimation,
} = await import('../../src/core/chartTheme');

describe('SEMANTIC — the financial color pair', () => {
  it('income is emerald, expense is rose — the app-wide pair', () => {
    expect(SEMANTIC.income).toBe('#10b981');
    expect(SEMANTIC.expense).toBe('#f43f5e');
  });

  it('the investment allocation map survives the move from PortfolioBreakdown intact', () => {
    expect(INVESTMENT_COLORS).toEqual({
      stocks: '#3b82f6',
      crypto: '#f59e0b',
      real_estate: '#10b981',
      gold: '#fbbf24',
      reit: '#6366f1',
      other: '#8b5cf6',
    });
  });

  it('one font family — the app font, not a fossil', () => {
    expect(CHART_FONT).toContain('IBM Plex Sans Arabic');
    expect(CHART_FONT).not.toContain('Inter');
  });
});

describe('glassTooltip — one card for every chart', () => {
  it('is a dark glass card: translucent slate, hairline border, rounded', () => {
    const tt = glassTooltip();
    expect(tt.backgroundColor).toBe('rgba(15, 23, 42, 0.78)');
    expect(tt.borderColor).toBe('rgba(255, 255, 255, 0.12)');
    expect(tt.borderWidth).toBe(1);
    expect(tt.cornerRadius).toBe(14);
  });

  it('speaks the app font in both title and body', () => {
    const tt = glassTooltip();
    expect(tt.titleFont.family).toBe(CHART_FONT);
    expect(tt.bodyFont.family).toBe(CHART_FONT);
  });

  it('allows per-surface overrides without losing the glass defaults', () => {
    const tt = glassTooltip({ displayColors: false, backgroundColor: 'rgba(1, 2, 3, 0.5)' });
    expect(tt.displayColors).toBe(false);
    expect(tt.backgroundColor).toBe('rgba(1, 2, 3, 0.5)');
    expect(tt.cornerRadius).toBe(14); // untouched default survives
  });
});

describe('faintGrid — faint gridlines, the zero line speaks', () => {
  it('hides the x grid entirely', () => {
    expect(faintGrid('x')).toEqual({ display: false });
  });

  it('whispers for ordinary y lines and emphasizes zero', () => {
    const grid = faintGrid('y');
    const ordinary = grid.color({ tick: { value: 42 } });
    const zero = grid.color({ tick: { value: 0 } });
    expect(ordinary).toBe('rgba(148, 163, 184, 0.09)');
    expect(zero).toBe('rgba(148, 163, 184, 0.4)');
    expect(grid.lineWidth({ tick: { value: 42 } })).toBe(1);
    expect(grid.lineWidth({ tick: { value: 0 } })).toBe(2);
  });
});

describe('axisTicks — one tick voice', () => {
  it('uses the app font, muted slate, bold', () => {
    const ticks = axisTicks();
    expect(ticks.font.family).toBe(CHART_FONT);
    expect(ticks.font.weight).toBe('bold');
    expect(ticks.color).toContain('148, 163, 184');
  });
});

describe('softFill — the soft gradient math', () => {
  const ctx = {
    createLinearGradient: (_x0: number, _y0: number, _x1: number, _y1: number) => ({
      stops: [] as string[],
      addColorStop: function (offset: number, color: string) {
        (this as { stops: string[] }).stops.push(`${offset}:${color}`);
      },
    }),
  } as unknown as CanvasRenderingContext2D;

  it('fades from the given alpha at the top to nothing at the baseline', () => {
    const g = softFill(ctx, { top: 0, bottom: 200 }, SEMANTIC.income) as {
      stops: string[];
    };
    expect(g.stops).toEqual(['0:rgba(16, 185, 129, 0.22)', '1:rgba(16, 185, 129, 0)']);
  });

  it('honors a custom starting alpha', () => {
    const g = softFill(ctx, { top: 0, bottom: 100 }, '#f43f5e', 0.3) as {
      stops: string[];
    };
    expect(g.stops[0]).toBe('0:rgba(244, 63, 94, 0.3)');
    expect(g.stops[1]).toBe('1:rgba(244, 63, 94, 0)');
  });

  it('returns the flat color when there is no plot area yet', () => {
    expect(softFill(ctx, null as never, '#10b981')).toBe('#10b981');
  });
});

describe('chartAnimation — the motion gate', () => {
  beforeEach(() => vi.mocked(prefersReducedMotion).mockReturnValue(false));

  it('is short and gentle by default', () => {
    expect(chartAnimation()).toEqual({ duration: 400 });
  });

  it('is NOTHING at all under prefers-reduced-motion', () => {
    vi.mocked(prefersReducedMotion).mockReturnValue(true);
    expect(chartAnimation()).toBe(false);
  });
});
