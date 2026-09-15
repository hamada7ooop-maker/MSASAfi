import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { ClassicDashboard } from '../../src/features/home/components/ClassicDashboard';
import { useHomeData } from '../../src/features/home/hooks/useHomeData';
import { useAppStore } from '../../src/store/appStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { APP_VERSION } from '../../src/core/constants';

/**
 * Directive 19 / Batch 1 — CHARACTERIZATION TESTS.
 *
 * Written and pinned GREEN against the pre-refactor ClassicDashboard before a
 * single line of it was touched (owner-mandated order of operations). The
 * decomposition must keep every behavior asserted here identical: homeOrder
 * driven rendering, edit mode, simple mode, the twin-card pairing, the smart
 * action banner, error/skeleton states, and the version footer.
 *
 * Child widgets are stubbed — this suite pins the COMPOSITION ROOT's
 * behavior, not the widgets' internals (those get their own suites as they
 * are rebuilt). No locale is loaded, so t() deterministically returns keys.
 */

// ── Widget stubs (identify by data-testid) ─────────────────────────────────
// Inline JSX in each factory: vi.mock factories are hoisted above module
// scope, so they cannot close over module-level helpers (TDZ).

vi.mock('../../src/features/home/hooks/useHomeData', () => ({ useHomeData: vi.fn() }));
// Batch 1 module boundary: the balance widget is now HeroBalanceCard
// (was BalanceCard). The pinned BEHAVIOR is unchanged — the 'balance'
// section renders the balance widget.
vi.mock('../../src/features/home/components/dashboard/HeroBalanceCard', () => ({ HeroBalanceCard: () => <div data-testid="w-balance" /> }));
vi.mock('../../src/features/home/components/IncomeExpenseCards', () => ({ IncomeExpenseCards: () => <div data-testid="w-income-expense" /> }));
vi.mock('../../src/features/home/components/AIPulse', () => ({ AIPulse: () => <div data-testid="w-ai-pulse" /> }));
vi.mock('../../src/features/home/components/QuickAccess', () => ({ QuickAccess: () => <div data-testid="w-quick-access" /> }));
vi.mock('../../src/features/home/components/RecentTransactions', () => ({ RecentTransactions: () => <div data-testid="w-recent" /> }));
vi.mock('../../src/features/home/components/AlertsCenter', () => ({ AlertsCenter: () => <div data-testid="w-alerts" /> }));
vi.mock('../../src/features/home/components/SavingsTree', () => ({ SavingsTree: () => <div data-testid="w-tree" /> }));
vi.mock('../../src/features/home/components/WhatIfSimulator', () => ({ WhatIfSimulator: () => <div data-testid="w-what-if" /> }));
// Batch 1 module boundary: the four market widgets are now one PulseStrip
// (kind-driven). Same pinned behavior — each pulse section renders its strip.
vi.mock('../../src/features/home/components/dashboard/PulseStrip', () => ({
  PulseStrip: ({ kind }: { kind: string }) => <div data-testid={`w-pulse-${kind}`} />,
}));
vi.mock('../../src/features/home/components/WeeklyReview', () => ({ WeeklyReview: () => <div data-testid="w-weekly" /> }));
vi.mock('../../src/features/home/components/HabitStreak', () => ({ HabitStreak: () => <div data-testid="w-streak" /> }));
vi.mock('../../src/features/home/components/UpcomingBills', () => ({ UpcomingBills: () => <div data-testid="w-upcoming" /> }));
vi.mock('../../src/features/home/components/TopExpenses', () => ({ TopExpenses: () => <div data-testid="w-top-expenses" /> }));
vi.mock('../../src/features/home/components/DailyPacing', () => ({ DailyPacing: () => <div data-testid="w-pacing" /> }));
vi.mock('../../src/features/home/components/Insights', () => ({ Insights: () => <div data-testid="w-insights" /> }));
vi.mock('../../src/features/home/components/DashboardCharts', () => ({ DashboardCharts: () => <div data-testid="w-charts" /> }));
vi.mock('../../src/features/home/components/City3DWidget', () => ({ City3DWidget: () => <div data-testid="w-city3d" /> }));
vi.mock('../../src/features/home/components/PredictiveAIWidget', () => ({ PredictiveAIWidget: () => <div data-testid="w-predictive" /> }));
vi.mock('../../src/features/home/components/GamificationWidget', () => ({
  GamificationWidget: () => <div data-testid="w-gamification" />,
  GamificationRankCard: () => <div data-testid="w-rank-card" />,
}));
vi.mock('../../src/features/home/components/FinancialScoreCard', () => ({ FinancialScoreCard: () => <div data-testid="w-financial-score" /> }));
vi.mock('../../src/features/home/components/NetWorthTrend', () => ({ NetWorthTrend: () => <div data-testid="w-net-worth" /> }));
vi.mock('../../src/features/home/components/SalaryCountdown', () => ({ SalaryCountdown: () => <div data-testid="w-salary" /> }));

const mockUseHomeData = vi.mocked(useHomeData);

const order = (ids: Array<{ id: string; visible?: boolean }>) =>
  ids.map(({ id, visible = true }) => ({ id, visible, labelKey: `home.section.${id}`, icon: 'star' }));

const makeHomeData = (overrides: Record<string, unknown> = {}) => ({
  balance: 12_500,
  monthlyStats: { income: 8000, expense: 5200, weekly: { ok: true }, breakdown: {} },
  recentTransactions: [],
  budgets: [],
  upcomingBills: [],
  isLoading: false,
  error: null,
  retry: vi.fn(),
  financialScore: 82,
  sustainability: { ok: true },
  prediction: { daysLeft: 12, predictedBalance: 9000 },
  anomalies: [],
  categoryBreakdown: {},
  streak: 4,
  marketData: { economic: [], crypto: [], news: [] },
  recommendations: [],
  netWorthHistory: [],
  nwPeriod: '6m',
  setNwPeriod: vi.fn(),
  ...overrides,
});

function mountDashboard(homeDataOverrides: Record<string, unknown> = {}) {
  mockUseHomeData.mockReturnValue(makeHomeData(homeDataOverrides) as ReturnType<typeof useHomeData>);
  return render(<ClassicDashboard />);
}

beforeEach(() => {
  vi.clearAllMocks();
  useAppStore.setState({ isHomeEditing: false, isGlobalActionOpen: false });
  useSettingsStore.setState({ homeOrder: order([{ id: 'balance' }, { id: 'incomeExpense' }, { id: 'recent' }]), isSimpleMode: false });
});

describe('ClassicDashboard — characterization (composition root contract)', () => {
  it('renders skeletons while the first live result is still loading', () => {
    mountDashboard({ isLoading: true });
    expect(screen.queryByTestId('w-balance')).not.toBeInTheDocument();
    expect(document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('shows the honest error state (with retry) when the live query failed', () => {
    const retry = vi.fn();
    mountDashboard({ error: new Error('boom'), retry });
    expect(screen.queryByTestId('w-balance')).not.toBeInTheDocument();
    expect(screen.getByTestId('error-state')).toBeInTheDocument();
    fireEvent.click(screen.getByText('refresh').closest('button') as HTMLElement);
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('renders each visible homeOrder section, in order', () => {
    mountDashboard();
    const ids = ['w-balance', 'w-income-expense', 'w-recent'].map((id) => screen.getByTestId(id));
    expect(ids.every(Boolean)).toBe(true);
    // DOM order follows homeOrder order: balance precedes incomeExpense precedes recent
    expect(ids[0].compareDocumentPosition(ids[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(ids[1].compareDocumentPosition(ids[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('hides invisible sections outside edit mode, shows them dimmed inside it', () => {
    useSettingsStore.setState({ homeOrder: order([{ id: 'balance' }, { id: 'recent', visible: false }]) });
    const { rerender } = mountDashboard();
    expect(screen.queryByTestId('w-recent')).not.toBeInTheDocument();

    useAppStore.setState({ isHomeEditing: true });
    rerender(<ClassicDashboard />);
    const dimmed = screen.getByTestId('w-recent').closest('.opacity-40');
    expect(dimmed).toBeTruthy();
    expect(dimmed?.className).toContain('grayscale');
  });

  it('renders the smart-action banner CTA and routes it to the global action sheet', () => {
    useSettingsStore.setState({ homeOrder: order([{ id: 'banner' }]) });
    mountDashboard();
    // No locale loaded → t() returns the key; the CTA is the only bolt button.
    const cta = screen.getByText('bolt').closest('button');
    expect(cta).toBeTruthy();
    fireEvent.click(cta as HTMLElement);
    expect(useAppStore.getState().isGlobalActionOpen).toBe(true);
  });

  it('edit mode: the customize toggle flips isHomeEditing, and move/visibility controls appear', () => {
    useSettingsStore.setState({ homeOrder: order([{ id: 'balance' }, { id: 'recent' }]) });
    mountDashboard();
    const customize = screen.getByText('dashboard_customize').closest('button');
    fireEvent.click(customize as HTMLElement);
    expect(useAppStore.getState().isHomeEditing).toBe(true);

    // The edit toolbar exposes move-up / move-down / show-hide per section.
    // (moveUp/moveDown keys are absent from every locale, so t() returns the
    // key deterministically; the eye toggle is found by its icon instead —
    // 'action.show' translates once the ar locale loads asynchronously.)
    expect(screen.getAllByLabelText('action.moveUp').length).toBe(2);
    expect(screen.getAllByLabelText('action.moveDown').length).toBe(2);
    expect(screen.getAllByText('visibility').length).toBe(2);
  });

  it('edit mode: move-down reorders the persisted homeOrder via the settings store', () => {
    useSettingsStore.setState({ homeOrder: order([{ id: 'balance' }, { id: 'recent' }]) });
    useAppStore.setState({ isHomeEditing: true });
    mountDashboard();

    // first section's move-down button (both sections render one; first is enabled)
    const moveDownButtons = screen.getAllByLabelText('action.moveDown');
    fireEvent.click(moveDownButtons[0]);

    const ids = useSettingsStore.getState().homeOrder.map((s: { id: string }) => s.id);
    expect(ids).toEqual(['recent', 'balance']);
  });

  it('edit mode: the eye toggle flips section visibility in the store', () => {
    useSettingsStore.setState({ homeOrder: order([{ id: 'balance' }, { id: 'recent' }]) });
    useAppStore.setState({ isHomeEditing: true });
    mountDashboard();
    const eyeButtons = screen.getAllByText('visibility').map((el) => el.closest('button') as HTMLElement);
    fireEvent.click(eyeButtons[0]);
    expect(useSettingsStore.getState().homeOrder[0].visible).toBe(false);
  });

  it('move-up on the first section is disabled (boundary guard)', () => {
    useSettingsStore.setState({ homeOrder: order([{ id: 'balance' }, { id: 'recent' }]) });
    useAppStore.setState({ isHomeEditing: true });
    mountDashboard();
    expect((screen.getAllByLabelText('action.moveUp')[0] as HTMLButtonElement).disabled).toBe(true);
  });

  it('simple mode keeps only the essential blocks', () => {
    useSettingsStore.setState({
      homeOrder: order([{ id: 'balance' }, { id: 'incomeExpense' }, { id: 'recent' }, { id: 'quickAccess' }, { id: 'alerts' }, { id: 'tree' }, { id: 'newsPulse' }]),
      isSimpleMode: true,
    });
    mountDashboard();
    expect(screen.getByTestId('w-balance')).toBeInTheDocument();
    expect(screen.getByTestId('w-quick-access')).toBeInTheDocument();
    expect(screen.queryByTestId('w-tree')).not.toBeInTheDocument();
    expect(screen.queryByTestId('w-pulse-news')).not.toBeInTheDocument();
  });

  it('twin pairing: adjacent financialScore+gamification render as one GamificationWidget, not the rank card', () => {
    useSettingsStore.setState({ homeOrder: order([{ id: 'financialScore' }, { id: 'gamification' }]) });
    mountDashboard();
    expect(screen.getByTestId('w-gamification')).toBeInTheDocument();
    expect(screen.queryByTestId('w-rank-card')).not.toBeInTheDocument();
  });

  it('gamification alone (score hidden) keeps its own widget', () => {
    useSettingsStore.setState({ homeOrder: order([{ id: 'gamification' }, { id: 'balance' }]) });
    mountDashboard();
    expect(screen.getByTestId('w-gamification')).toBeInTheDocument();
  });

  it('unknown section ids render nothing without crashing the board', () => {
    useSettingsStore.setState({ homeOrder: order([{ id: 'does-not-exist' }, { id: 'balance' }]) });
    mountDashboard();
    expect(screen.getByTestId('w-balance')).toBeInTheDocument();
  });

  it('legacy ids still route to their successors (pulse → AIPulse, currencies → CurrencyPulse)', () => {
    useSettingsStore.setState({ homeOrder: order([{ id: 'pulse' }, { id: 'currencies' }]) });
    mountDashboard();
    expect(screen.getByTestId('w-ai-pulse')).toBeInTheDocument();
    expect(screen.getByTestId('w-pulse-currency')).toBeInTheDocument();
  });

  it('renders the engine version footer from APP_VERSION', () => {
    mountDashboard();
    expect(screen.getByText(`MASARIFI INTELLIGENCE ENGINE V${APP_VERSION}`)).toBeInTheDocument();
  });
});
