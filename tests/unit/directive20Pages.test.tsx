import React from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

type AccountLike = { id: string; name: string; type: 'bank'; balance: number; initialBalance: number; archived?: boolean };
type ChallengeLike = { id: string; icon: string; title: string; body: string; reward: number };
type RecommendationLike = { id: string; icon: string; title: string; body: string; priority: 'high' | 'normal'; action?: string };

const mocks = vi.hoisted(() => ({
  accounts: { active: [] as AccountLike[], archived: [] as AccountLike[], totalBalance: 0, isLoading: false, error: null as Error | null, retry: vi.fn(), addAccount: vi.fn(), updateAccount: vi.fn(), deleteAccount: vi.fn(), transferBetween: vi.fn() },
  advisor: { financialScore: 72, challenges: [] as ChallengeLike[], recommendations: [] as RecommendationLike[], deepInsights: 'Insight', isAdvisorLoading: false, necessityStats: { need: 20, want: 10, needPct: 67, wantPct: 33, total: 30 }, error: null as Error | null, retry: vi.fn() },
  navigate: vi.fn(), toast: vi.fn(),
}));

vi.mock('../../src/i18n/index', () => ({ useI18n: () => ({ t: (k: string) => k, isRTL: false }) }));
vi.mock('../../src/core/hooks/useFormat', () => ({ useFormat: () => ({ fmt: (n: number) => String(n), parseNum: (s: string) => Number(s) || 0, sanitizeNumericInput: (s: string) => s, getCurrencySymbol: () => 'SAR' }) }));
vi.mock('../../src/features/accounts/hooks/useAccounts', () => ({ useAccounts: () => mocks.accounts }));
vi.mock('../../src/features/advisor/hooks/useAdvisorData', () => ({ useAdvisorData: () => mocks.advisor }));
vi.mock('../../src/components/common/ErrorState', () => ({ ErrorState: ({ onRetry }: { onRetry: () => void }) => <button onClick={onRetry}>retry</button> }));
vi.mock('../../src/core/loyalty', () => ({ checkMilestone: vi.fn() }));
vi.mock('../../src/toast', () => ({ toast: mocks.toast }));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('../../src/features/advisor/components/RetirementSimulator', () => ({ RetirementSimulator: () => <div>retirement</div> }));
vi.mock('../../src/features/advisor/components/NecessityBreakdown', () => ({ NecessityBreakdown: () => <div>necessity</div> }));
vi.mock('../../src/features/reports/services/exportService', () => ({ ExportService: { saveFileNative: vi.fn() } }));

import { Accounts } from '../../src/features/accounts/components/Accounts';
import { AdvisorPage } from '../../src/features/advisor/components/AdvisorPage';

const account = (id: string, archived = false) => ({ id, name: `Account ${id}`, type: 'bank', balance: 100, initialBalance: 100, archived });

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(mocks.accounts, { active: [account('a1'), account('a2')], archived: [account('old', true)], totalBalance: 200, isLoading: false, error: null });
  Object.assign(mocks.advisor, { isAdvisorLoading: false, error: null, challenges: [], recommendations: [] });
});

describe('Directive 20 high-value page characterization', () => {
  it('renders accounts, opens the add modal, saves an account, archives and deletes', async () => {
    render(<Accounts />);
    expect(screen.getByText('nav.accounts')).toBeInTheDocument();
    expect(screen.getByText('Account a1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'action.add' }));
    fireEvent.change(screen.getByPlaceholderText('account.namePlaceholder'), { target: { value: 'New wallet' } });
    fireEvent.click(screen.getByText('action.save'));
    await waitFor(() => expect(mocks.accounts.addAccount).toHaveBeenCalledWith(expect.objectContaining({ name: 'New wallet', type: 'bank' })));
    fireEvent.click(screen.getAllByText('action.archive')[0]);
    expect(mocks.accounts.updateAccount).toHaveBeenCalledWith('a1', { archived: true });
    fireEvent.click(screen.getAllByRole('button', { name: 'action.delete' })[0]);
    fireEvent.click(screen.getByText('action.confirm'));
    await waitFor(() => expect(mocks.accounts.deleteAccount).toHaveBeenCalledWith('a1'));
  });

  it('opens transfer flow and validates the transfer through the modal', () => {
    render(<Accounts />);
    fireEvent.click(screen.getByTitle('account.transfer'));
    expect(screen.getByText('account.fromSource')).toBeInTheDocument();
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'a1' } });
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '25' } });
    fireEvent.click(screen.getAllByText('account.transfer')[1]);
    expect(mocks.accounts.transferBetween).toHaveBeenCalledWith('a1', 'a2', 25);
  });

  it('covers loading and error states without confusing them with an empty account list', () => {
    mocks.accounts.isLoading = true;
    const { rerender } = render(<Accounts />);
    expect(screen.getByText('misc.loading')).toBeInTheDocument();
    mocks.accounts.isLoading = false;
    mocks.accounts.error = new Error('db');
    rerender(<Accounts />);
    fireEvent.click(screen.getByText('retry'));
    expect(mocks.accounts.retry).toHaveBeenCalled();
  });

  it('renders advisor score, insights, challenge acceptance, and recommendation navigation', () => {
    mocks.advisor.challenges = [{ id: 'c1', icon: '🎯', title: 'Challenge', body: 'Do it', reward: 5 }];
    mocks.advisor.recommendations = [{ id: 'r1', icon: '💡', title: 'Recommendation', body: 'Go', priority: 'high', action: 'accounts' }];
    render(<AdvisorPage />);
    expect(screen.getByText('72')).toBeInTheDocument();
    expect(screen.getByText('Insight')).toBeInTheDocument();
    fireEvent.click(screen.getByText('ai.challenge.accept'));
    fireEvent.click(screen.getByText('action.show'));
    expect(mocks.navigate).toHaveBeenCalledWith('/accounts');
  });

  it('renders advisor loading and failure states', () => {
    mocks.advisor.isAdvisorLoading = true;
    const { rerender } = render(<AdvisorPage />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    mocks.advisor.isAdvisorLoading = false;
    mocks.advisor.error = new Error('analysis');
    rerender(<AdvisorPage />);
    fireEvent.click(screen.getByText('retry'));
    expect(mocks.advisor.retry).toHaveBeenCalled();
  });
});
