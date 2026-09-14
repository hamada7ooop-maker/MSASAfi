import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, renderHook, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db as DB } from '@/core/db/core';
import { AccountRepository } from '@/core/db/repositories/accounts';
import { BudgetRepository } from '@/core/db/repositories/budgets';
import { TransactionRepository } from '@/core/db/repositories/transactions';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import { useInvestments } from '@/features/investments/hooks/useInvestments';
import { useBills } from '@/features/bills/hooks/useBills';
import { useDebts } from '@/features/debts/hooks/useDebts';
import { useGoals } from '@/features/goals/hooks/useGoals';
import { useBudgets } from '@/features/budgets/hooks/useBudgets';
import { useTransactions } from '@/features/transactions/hooks/useTransactions';
import { useReportsData } from '@/features/reports/hooks/useReportsData';
import { useLoyalty } from '@/features/shop/hooks/useLoyalty';
import { useSearch } from '@/features/search/hooks/useSearch';
import { useHomeData } from '@/features/home/hooks/useHomeData';
import { useAdvisorData } from '@/features/advisor/hooks/useAdvisorData';
import { Accounts } from '@/features/accounts/components/Accounts';
import { TransactionList } from '@/features/transactions/components/TransactionList';
import { Reports } from '@/features/reports/components/Reports';
import { ErrorState } from '@/components/common/ErrorState';
import { useI18n } from '@/i18n/index';

/**
 * Directive 16 — Fetch Error Disambiguation.
 *
 * Every data hook used to swallow fetch failures and return empty state, so
 * the UI could not tell "new user with nothing recorded" from "the database
 * query just failed". These characterization tests pin the new contract:
 *
 *   1. When the underlying query rejects, the hook exposes a non-null
 *      `error` and finishes loading (not stuck, not silently empty).
 *   2. `retry` re-runs the fetch and clears the error once it succeeds.
 *   3. Views render the shared ErrorState (with a retry button) instead of
 *      the "no items yet" empty state, and recover when retry succeeds.
 */

async function wipe() {
  await DB.transaction('rw', DB.tables, async () => {
    for (const t of DB.tables) await t.clear();
  });
  await new Promise((r) => setTimeout(r, 0));
}

const ERR = new Error('IndexedDB unavailable');

/** ErrorState surfaces as [data-testid=error-state] with role=alert. */
const errorStateIn = (c: HTMLElement | Document = document) =>
  (c === document ? document : c).querySelector('[data-testid="error-state"]');

describe('Directive 16 — hooks expose error when the query rejects', () => {
  beforeEach(async () => {
    await wipe();
    vi.restoreAllMocks();
  });

  it('useAccounts: rejects → error set, loading finished; retry recovers', async () => {
    const spy = vi.spyOn(AccountRepository, 'getAll').mockRejectedValueOnce(ERR);
    const { result } = renderHook(() => useAccounts());

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error?.message).toBe('IndexedDB unavailable');
    // spy consumed the rejection; act() wraps the retry-driven state updates
    await act(async () => {
      await result.current.retry();
    });
    expect(result.current.error).toBeNull();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('useInvestments: rejects → error set', async () => {
    vi.spyOn(DB, 'getInvestments').mockRejectedValueOnce(ERR);
    const { result } = renderHook(() => useInvestments());
    await waitFor(() => expect(result.current.error?.message).toBe('IndexedDB unavailable'));
    expect(result.current.isLoading).toBe(false);
  });

  it('useBills: rejects → error set', async () => {
    vi.spyOn(DB, 'getBills').mockRejectedValueOnce(ERR);
    const { result } = renderHook(() => useBills());
    await waitFor(() => expect(result.current.error?.message).toBe('IndexedDB unavailable'));
    expect(result.current.isLoading).toBe(false);
  });

  it('useDebts: rejects → error set', async () => {
    vi.spyOn(DB, 'getDebts').mockRejectedValueOnce(ERR);
    const { result } = renderHook(() => useDebts());
    await waitFor(() => expect(result.current.error?.message).toBe('IndexedDB unavailable'));
    expect(result.current.isLoading).toBe(false);
  });

  it('useGoals: rejects → error set', async () => {
    vi.spyOn(DB, 'getGoals').mockRejectedValueOnce(ERR);
    const { result } = renderHook(() => useGoals());
    await waitFor(() => expect(result.current.error?.message).toBe('IndexedDB unavailable'));
    expect(result.current.isLoading).toBe(false);
  });

  it('useBudgets: rejects → error set', async () => {
    vi.spyOn(DB, 'getBudgets').mockRejectedValueOnce(ERR);
    const { result } = renderHook(() => useBudgets());
    await waitFor(() => expect(result.current.error?.message).toBe('IndexedDB unavailable'));
    expect(result.current.isLoading).toBe(false);
  });

  it('useTransactions: rejects → error set (not an empty list)', async () => {
    vi.spyOn(TransactionRepository, 'getAll').mockRejectedValueOnce(ERR);
    const { result } = renderHook(() => useTransactions());
    await waitFor(() => expect(result.current.error?.message).toBe('IndexedDB unavailable'));
    expect(result.current.isLoading).toBe(false);
  });

  it('useReportsData: rejects → error set (zeros are not "no activity")', async () => {
    vi.spyOn(TransactionRepository, 'getMonthlyStats').mockRejectedValueOnce(ERR);
    const { result } = renderHook(() => useReportsData());
    await waitFor(() => expect(result.current.error?.message).toBe('IndexedDB unavailable'));
    expect(result.current.isLoading).toBe(false);
  });

  it('useLoyalty: rejects → error set (zero points are not "0 earned")', async () => {
    vi.spyOn(DB, 'getSetting').mockRejectedValueOnce(ERR);
    const { result } = renderHook(() => useLoyalty());
    await waitFor(() => expect(result.current.error?.message).toBe('IndexedDB unavailable'));
    expect(result.current.isLoading).toBe(false);
  });

  it('useSearch: rejects → error set; a fresh query clears it', async () => {
    vi.spyOn(TransactionRepository, 'getAll').mockRejectedValueOnce(ERR);
    const { result, rerender } = renderHook(({ q }: { q: string }) => useSearch(q), {
      initialProps: { q: 'coffee' },
    });

    // The search debounces by 300ms — wait past it.
    await waitFor(() => expect(result.current.error).not.toBeNull(), { timeout: 4000 });

    // A new (healthy) query clears the error.
    await act(async () => {
      rerender({ q: 'tea' });
    });
    await waitFor(() => expect(result.current.error).toBeNull(), { timeout: 4000 });
  });

  it('useHomeData: live query failure is captured as error, not thrown; retry recovers', async () => {
    // The stock useLiveQuery THROWS on querier rejection. useHomeData must
    // capture it: rendering this hook with a failing query must not throw.
    vi.spyOn(BudgetRepository, 'getAll').mockRejectedValueOnce(ERR);
    const { result } = renderHook(() => useHomeData());

    await waitFor(() => expect(result.current.error?.message).toBe('IndexedDB unavailable'), {
      timeout: 5000,
    });

    // Retry resubscribes; the mock is exhausted, so the second subscription
    // succeeds and the error clears.
    await act(async () => {
      result.current.retry();
    });
    await waitFor(() => expect(result.current.error).toBeNull(), { timeout: 5000 });
  });

  it('useAdvisorData: analysis fetch failure surfaces through the combined error', async () => {
    // Persistent rejection: the advisor effect re-runs when the home data
    // live queries settle, and a successful re-run legitimately clears the
    // error (self-healing). A persistent failure must stay surfaced.
    vi.spyOn(TransactionRepository, 'getAll').mockRejectedValue(ERR);
    const { result } = renderHook(() => useAdvisorData());
    await waitFor(() => expect(result.current.error?.message).toBe('IndexedDB unavailable'), {
      timeout: 5000,
    });
  });
});

describe('Directive 16 — views disambiguate error from empty', () => {
  beforeEach(async () => {
    await wipe();
    vi.restoreAllMocks();
  });

  it('Accounts: failed load renders ErrorState, not the "no accounts" empty state; retry recovers', async () => {
    const spy = vi.spyOn(AccountRepository, 'getAll').mockRejectedValueOnce(ERR);
    const { container } = render(
      <MemoryRouter>
        <Accounts />
      </MemoryRouter>
    );

    await waitFor(() => expect(errorStateIn(container)).not.toBeNull());
    // The empty state must NOT be shown for a failure.
    expect(container.textContent).not.toContain('لا يوجد بيانات لهذا الحساب');

    // The retry button re-runs the fetch; the mock is exhausted, so it
    // succeeds with an empty (clean) list — and now the empty state shows.
    const retryBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => (b.textContent || '').includes('إعادة المحاولة')
    );
    expect(retryBtn).toBeDefined();
    await act(async () => {
      fireEvent.click(retryBtn as Element);
    });

    await waitFor(() => expect(errorStateIn(container)).toBeNull());
    expect(container.textContent).toContain('لا يوجد بيانات لهذا الحساب');
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('TransactionList: failed load renders ErrorState, not "no transactions"', async () => {
    vi.spyOn(TransactionRepository, 'getAll').mockRejectedValueOnce(ERR);
    const { container } = render(
      <MemoryRouter>
        <TransactionList />
      </MemoryRouter>
    );

    await waitFor(() => expect(errorStateIn(container)).not.toBeNull(), { timeout: 5000 });
    expect(container.textContent).not.toContain('لا توجد معاملات');
  });

  it('Reports: failed aggregation renders ErrorState instead of all-zero stats', async () => {
    vi.spyOn(TransactionRepository, 'getMonthlyStats').mockRejectedValueOnce(ERR);
    const { container } = render(
      <MemoryRouter>
        <Reports />
      </MemoryRouter>
    );

    await waitFor(() => expect(errorStateIn(container)).not.toBeNull());
  });
});

describe('Directive 16 — ErrorState component contract', () => {
  it('renders role=alert with the localized message and retry button', () => {
    const { container } = render(
      <ErrorStateDemo onRetry={() => undefined} />
    );
    const el = container.querySelector('[data-testid="error-state"]');
    expect(el).not.toBeNull();
    expect(el?.getAttribute('role')).toBe('alert');
    expect(container.textContent).toContain('فشل تحميل البيانات');
    expect(container.textContent).toContain('إعادة المحاولة');
  });

  it('calls onRetry when the button is pressed', () => {
    const onRetry = vi.fn();
    const { container } = render(<ErrorState onRetry={onRetry} />);
    const btn = container.querySelector('button');
    expect(btn).not.toBeNull();
    fireEvent.click(btn as Element);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

/** Renders ErrorState with the given props — exercises the i18n default path. */
function ErrorStateDemo({ onRetry }: { onRetry: () => void }) {
  void useI18n();
  return <ErrorState onRetry={onRetry} />;
}
