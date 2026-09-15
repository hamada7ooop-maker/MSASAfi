/**
 * Directive 19 — Batch 4: characterization of the four chart surfaces.
 *
 * Written BEFORE the theme unification, green against the current code.
 * The job is to pin each surface's DATA contract — the labels, the dataset
 * order and values, the cutout, the aggregation math, the empty-state
 * behaviors — so the cosmetic unification (semantic colors, glass tooltips,
 * faint gridlines, app font) cannot silently change what a chart SAYS.
 *
 * Chart.js never really renders in jsdom (no 2d context); the lazy loader
 * is mocked with a fake Chart class that captures every config handed to
 * it — the surfaces are asserted through those captured configs.
 *
 * NetWorthTrend is the exception: it EAGERLY imports chart.js (a defect
 * this batch fixes) and jsdom's null context makes it bail before building
 * a chart — so its current characterization is DOM-only, and its chart
 * config contract is pinned by the post-fix suite below.
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const instances: unknown[] = [];
let destroyed = 0;

class FakeChart {
  constructor(_canvas: unknown, config: unknown) {
    instances.push(config);
  }
  destroy() {
    destroyed++;
  }
  static getChart() {
    return null;
  }
}

vi.mock('../../src/core/charts', () => ({
  getChart: vi.fn(async () => FakeChart),
}));

const { getChart } = await import('../../src/core/charts');
const mockGetChart = vi.mocked(getChart);

const { DashboardCharts } = await import('../../src/features/home/components/DashboardCharts');
const { NetWorthTrend } = await import('../../src/features/home/components/NetWorthTrend');
const { ReportsTrend } = await import('../../src/features/reports/components/ReportsTrend');
const { PortfolioBreakdown } = await import('../../src/features/investments/components/PortfolioBreakdown');

import type { Investment } from '@/types';

type ChartConfig = {
  type: string;
  data: { labels: unknown[]; datasets: Record<string, unknown>[] };
  options: {
    animation: unknown;
    cutout: string;
    scales: Record<string, Record<string, unknown>>;
    plugins: Record<string, Record<string, unknown>>;
  };
} & Record<string, unknown>;

const lastConfig = () => instances[instances.length - 1] as ChartConfig;

beforeEach(() => {
  instances.length = 0;
  destroyed = 0;
  mockGetChart.mockClear();
});

// ═══════════════ DashboardCharts (doughnut) ═══════════════

describe('DashboardCharts — characterization', () => {
  it('renders the header, the category-count center, and custom legend chips', () => {
    const { container } = render(<DashboardCharts categoryBreakdown={{ food: 100, transport: 50 }} />);
    expect(screen.getByText('pie_chart')).toBeTruthy(); // header icon
    expect(screen.getByText('2')).toBeTruthy(); // center: category count
    // two legend chips, each a colored dot + label pair
    const dots = Array.from(container.querySelectorAll('div')).filter(
      (d) => typeof d.className === 'string' && d.className.includes('w-2.5') && d.className.includes('rounded-full')
    );
    expect(dots.length).toBe(2);
  });

  it('builds a doughnut of the breakdown: category colors, 72% cutout, hoverOffset 10', async () => {
    render(<DashboardCharts categoryBreakdown={{ food: 100, transport: 50 }} />);
    await waitFor(() => expect(instances.length).toBe(1));
    const cfg = lastConfig();
    expect(cfg.type).toBe('doughnut');
    expect(cfg.data.datasets[0].data).toEqual([100, 50]);
    expect(cfg.data.labels.length).toBe(2);
    expect(cfg.data.datasets[0].borderWidth).toBe(0);
    expect(cfg.data.datasets[0].hoverOffset).toBe(10);
    expect(cfg.options.cutout).toBe('72%');
    expect(cfg.options.plugins.legend.display).toBe(false);
    // backgroundColor comes from the category palette, one per key
    const bg = cfg.data.datasets[0].backgroundColor as string[];
    expect(bg.length).toBe(2);
    expect(new Set(bg).size).toBe(2);
  });

  it('renders nothing on the canvas when the breakdown is empty', async () => {
    render(<DashboardCharts categoryBreakdown={{}} />);
    await new Promise((r) => setTimeout(r, 120)); // past the 50ms init timer
    expect(instances.length).toBe(0);
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('destroys its chart on unmount', async () => {
    const { unmount } = render(<DashboardCharts categoryBreakdown={{ food: 100 }} />);
    await waitFor(() => expect(instances.length).toBe(1));
    unmount();
    expect(destroyed).toBeGreaterThan(0);
  });
});

// ═══════════════ ReportsTrend (line ×2) ═══════════════

describe('ReportsTrend — characterization', () => {
  const DATA = [
    { month: 0, income: 1000, expense: 400 },
    { month: 1, income: 1500, expense: 900 },
    { month: 2, income: 700, expense: 1100 },
  ];

  it('builds the two-line trend: income first, expense second, exact values', async () => {
    render(<ReportsTrend data={DATA} />);
    await waitFor(() => expect(instances.length).toBe(1));
    const cfg = lastConfig();
    expect(cfg.type).toBe('line');
    expect(cfg.data.labels.length).toBe(3);
    expect(cfg.data.datasets.length).toBe(2);
    expect(cfg.data.datasets[0].data).toEqual([1000, 1500, 700]);
    expect(cfg.data.datasets[1].data).toEqual([400, 900, 1100]);
    // both series: filled, tensioned, white-ringed points
    for (const ds of cfg.data.datasets) {
      expect(ds.fill).toBe(true);
      expect(ds.tension).toBe(0.4);
      expect(ds.pointBorderColor).toBe('#fff');
    }
  });

  it('keeps the y axis hidden and the legend on top', async () => {
    render(<ReportsTrend data={DATA} />);
    await waitFor(() => expect(instances.length).toBe(1));
    const cfg = lastConfig();
    expect(cfg.options.scales.y.display).toBe(false);
    expect(cfg.options.scales.y.beginAtZero).toBe(true);
    expect(cfg.options.plugins.legend.position).toBe('top');
    expect(cfg.options.scales.x.grid.display).toBe(false);
  });

  it('builds no chart for empty data', async () => {
    render(<ReportsTrend data={[]} />);
    await new Promise((r) => setTimeout(r, 60));
    expect(instances.length).toBe(0);
  });
});

// ═══════════════ PortfolioBreakdown (doughnut) ═══════════════

describe('PortfolioBreakdown — characterization', () => {
  const makeInv = (over: Partial<Investment> & { id: string }): Investment =>
    ({ name: 'x', type: 'stocks', value: 100, ...over }) as Investment;

  it('renders nothing at all without investments', () => {
    const { container } = render(<PortfolioBreakdown investments={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('groups by type SUMMING values, and draws the 70% cutout with bottom legend', async () => {
    render(
      <PortfolioBreakdown
        investments={[
          makeInv({ id: 'a', type: 'stocks', value: 100 }),
          makeInv({ id: 'b', type: 'stocks', value: 200 }),
          makeInv({ id: 'c', type: 'crypto', value: 50 }),
        ]}
      />
    );
    await waitFor(() => expect(instances.length).toBe(1));
    const cfg = lastConfig();
    expect(cfg.type).toBe('doughnut');
    // stocks aggregated 100+200=300, crypto 50 — order follows first appearance
    expect(cfg.data.datasets[0].data).toEqual([300, 50]);
    expect(cfg.data.labels.length).toBe(2);
    expect(cfg.options.cutout).toBe('70%');
    expect(cfg.data.datasets[0].hoverOffset).toBe(15);
    expect(cfg.options.plugins.legend.position).toBe('bottom');
    // the investment palette: stocks blue, crypto amber
    const bg = cfg.data.datasets[0].backgroundColor as string[];
    expect(bg[0]).toBe('#3b82f6');
    expect(bg[1]).toBe('#f59e0b');
  });

  it('falls back to the "other" color for unknown types', async () => {
    render(
      <PortfolioBreakdown investments={[makeInv({ id: 'a', type: 'vinyl', value: 10 })]} />
    );
    await waitFor(() => expect(instances.length).toBe(1));
    expect((lastConfig().data.datasets[0].backgroundColor as string[])[0]).toBe('#8b5cf6');
  });
});

// ═══════════════ NetWorthTrend (line, currently eager) ═══════════════

describe('NetWorthTrend — characterization (DOM contract)', () => {
  it('renders the header, the period selector, and fires onPeriodChange', () => {
    const onPeriodChange = vi.fn();
    render(<NetWorthTrend data={[]} period={6} onPeriodChange={onPeriodChange} />);

    expect(screen.getByText('trending_up')).toBeTruthy(); // header icon
    const select = document.querySelector('select') as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(Array.from(select.options).map((o) => o.value)).toEqual(['3', '6', '12']);
    expect(select.value).toBe('6');

    fireEvent.change(select, { target: { value: '12' } });
    expect(onPeriodChange).toHaveBeenCalledWith(12);
  });

  // The original characterization pinned the eager static import (getChart
  // never called). The batch's sanctioned fix flips that truth: the surface
  // now arrives through the shared lazy loader like its three siblings, and
  // a stubbed 2d context lets the full chart config be captured here.
  const gradientStops: string[] = [];
  const realGetContext = HTMLCanvasElement.prototype.getContext;

  beforeEach(() => {
    gradientStops.length = 0;
    HTMLCanvasElement.prototype.getContext = (() => ({
      createLinearGradient: () => ({
        addColorStop: (offset: number, color: string) =>
          gradientStops.push(`${offset}:${color}`),
      }),
    })) as never;
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = realGetContext;
  });

  it('now arrives through the lazy loader (the eager import is gone)', async () => {
    render(<NetWorthTrend data={[{ label: 'Jan', value: 5 }]} />);
    await waitFor(() => expect(mockGetChart).toHaveBeenCalled());
  });

  it('builds the sign-aware line: emerald above zero, rose below, zero-aware gradient', async () => {
    render(<NetWorthTrend data={[{ label: 'Jan', value: 100 }, { label: 'Feb', value: -50 }]} />);
    await waitFor(() => expect(instances.length).toBe(1));
    const cfg = lastConfig();
    expect(cfg.type).toBe('line');
    expect(cfg.data.datasets[0].data).toEqual([100, -50]);

    // the semantic pair by sign, through every scriptable path
    const ds = cfg.data.datasets[0];
    expect(ds.borderColor({ parsed: { y: 10 } })).toBe('#10b981');
    expect(ds.borderColor({ parsed: { y: -10 } })).toBe('#f43f5e');
    expect(ds.segment.borderColor({ p0: { parsed: { y: 5 } }, p1: { parsed: { y: 5 } } })).toBe('#10b981');
    expect(ds.segment.borderColor({ p0: { parsed: { y: -5 } }, p1: { parsed: { y: -5 } } })).toBe('#f43f5e');
    expect(ds.pointBackgroundColor({ raw: 3 })).toBe('#10b981');
    expect(ds.pointBackgroundColor({ raw: -3 })).toBe('#f43f5e');

    // the zero-aware gradient speaks the same pair
    expect(gradientStops.some((g) => g.includes('rgba(16, 185, 129'))).toBe(true);
    expect(gradientStops.some((g) => g.includes('rgba(244, 63, 94'))).toBe(true);
  });

  it('carries the glass tooltip, the faint grid, and the motion gate', async () => {
    render(<NetWorthTrend data={[{ label: 'Jan', value: 5 }]} />);
    await waitFor(() => expect(instances.length).toBe(1));
    const cfg = lastConfig();
    expect(cfg.options.plugins.tooltip.backgroundColor).toBe('rgba(15, 23, 42, 0.78)');
    expect(cfg.options.plugins.tooltip.displayColors).toBe(false);
    expect(cfg.options.animation).toEqual({ duration: 400 });
    // the zero line speaks, ordinary lines whisper
    expect(cfg.options.scales.y.grid.color({ tick: { value: 0 } })).toBe('rgba(148, 163, 184, 0.4)');
    expect(cfg.options.scales.y.grid.color({ tick: { value: 7 } })).toBe('rgba(148, 163, 184, 0.09)');
  });

  it('builds no chart for empty data', async () => {
    render(<NetWorthTrend data={[]} />);
    await new Promise((r) => setTimeout(r, 60));
    expect(instances.length).toBe(0);
  });
});

// ═══════════════ The unified theme wiring (post-fix) ═══════════════

describe('The unified theme on every surface', () => {
  it('DashboardCharts: glass tooltip + the 400ms motion gate (was 750ms ad-hoc)', async () => {
    render(<DashboardCharts categoryBreakdown={{ food: 100 }} />);
    await waitFor(() => expect(instances.length).toBe(1));
    const tt = lastConfig().options.plugins.tooltip;
    expect(tt.backgroundColor).toBe('rgba(15, 23, 42, 0.78)');
    expect(tt.borderColor).toBe('rgba(255, 255, 255, 0.12)');
    expect(tt.titleFont.family).toContain('IBM Plex Sans Arabic');
    expect(lastConfig().options.animation).toEqual({ duration: 400 });
  });

  it('ReportsTrend: the semantic pair + glass + the app font on legend and ticks', async () => {
    render(<ReportsTrend data={[{ month: 0, income: 10, expense: 5 }]} />);
    await waitFor(() => expect(instances.length).toBe(1));
    const cfg = lastConfig();
    expect(cfg.data.datasets[0].borderColor).toBe('#10b981');
    expect(cfg.data.datasets[1].borderColor).toBe('#f43f5e');
    expect(cfg.options.plugins.tooltip.backgroundColor).toBe('rgba(15, 23, 42, 0.78)');
    expect(cfg.options.plugins.legend.labels.font.family).toContain('IBM Plex Sans Arabic');
    expect(cfg.options.scales.x.ticks.font.family).toContain('IBM Plex Sans Arabic');
    expect(cfg.options.animation).toEqual({ duration: 400 });
  });

  it('PortfolioBreakdown: the theme palette, glass tooltip, and NO dead Inter font', async () => {
    render(
      <PortfolioBreakdown
        investments={[{ id: 'a', name: 'x', type: 'stocks', value: 10 } as Investment]}
      />
    );
    await waitFor(() => expect(instances.length).toBe(1));
    const cfg = lastConfig();
    expect(cfg.options.plugins.legend.labels.font.family).toContain('IBM Plex Sans Arabic');
    expect(JSON.stringify(cfg)).not.toContain('Inter');
    expect(cfg.options.plugins.tooltip.backgroundColor).toBe('rgba(15, 23, 42, 0.78)');
    expect(cfg.options.animation).toEqual({ duration: 400 });
  });
});
