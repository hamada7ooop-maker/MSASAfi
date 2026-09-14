import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, renderHook, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db as DB } from '@/core/db/core';
import { BudgetRepository } from '@/core/db/repositories/budgets';
import { TransactionRepository } from '@/core/db/repositories/transactions';
import { GoalRepository } from '@/core/db/repositories/goals';
import { AccountRepository } from '@/core/db/repositories/accounts';
import { StatisticsService } from '@/core/services/StatisticsService';
import { useHomeData } from '@/features/home/hooks/useHomeData';
import { useAdvisorData } from '@/features/advisor/hooks/useAdvisorData';
import { useLiveQuerySafe } from '@/core/hooks/useLiveQuerySafe';
import { ClassicDashboard } from '@/features/home/components/ClassicDashboard';
import { AdvisorPage } from '@/features/advisor/components/AdvisorPage';

/**
 * Directive 17 item 3 — `isLoading` "first result" semantics.
 *
 * History: `useHomeData.isLoading` compared live-query results to
 * `undefined`, but `useLiveQuerySafe` seeds them with `defaultResult` — they
 * are never undefined, so isLoading was permanently false and the dashboard
 * never showed its skeletons (a flash of empty numbers instead). That old
 * state was pinned by a characterization test first, which then flipped
 * deliberately as this directive's entire point:
 *
 *   NEW CONTRACT
 *   1. `isLoading` is true until the FIRST real result of the three primary
 *      queries (recent transactions, budgets, monthly stats) has arrived.
 *   2. `hasFirstResult` on `useLiveQuerySafe` is the honest signal: false
 *      until the first successful emission, true forever after (survives
 *      resubscription; an error before any success leaves it false).
 *   3. An early FAILURE still wins over skeletons (Directive 16 must not
 *      regress): ClassicDashboard and AdvisorPage render ErrorState, not an
 *      eternal skeleton, and retry recovers.
 */

async function wipe() {
  await DB.transaction('rw', DB.tables, async () => {
    for (const t of DB.tables) await t.clear();
  });
  await new Promise((r) => setTimeout(r, 0));
}

/** ErrorState surfaces as [data-testid=error-state] with role=alert (D16). */
const errorStateIn = (c: HTMLElement) => c.querySelector('[data-testid="error-state"]');

describe('Directive 17 item 3 — isLoading first-result semantics', () => {
  beforeEach(async () => {
    await wipe();
    vi.restoreAllMocks();
  });

  it('useHomeData: isLoading is TRUE while the first query is still pending (old behavior flipped)', async () => {
    // A never-resolving query: no result will ever arrive.
    vi.spyOn(BudgetRepository, 'getAll').mockImplementation(
      () => new Promise(() => {}) as Promise<never>
    );

    const { result } = renderHook(() => useHomeData());

    // OLD (pre-directive): false, because seeded defaults are never
    // undefined. NEW: true — the first result has not arrived.
    expect(result.current.isLoading).toBe(true);

    // …and it stays true no matter how long the query hangs.
    await new Promise((r) => setTimeout(r, 250));
    expect(result.current.isLoading).toBe(true);
    // Defaults are still exposed (stale/seeded data beats a crash).
    expect(result.current.budgets).toEqual([]);
  });

  it('useHomeData: isLoading settles to false once the first results arrive', async () => {
    const { result } = renderHook(() => useHomeData());
    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });
    expect(result.current.error).toBeNull();
  });

  it('useLiveQuerySafe: hasFirstResult false → true on first emission; survives resubscription', async () => {
    // Slow (50ms) but successful query, so "before" is observable.
    vi.spyOn(BudgetRepository, 'getAll').mockImplementation(
      () => new Promise((r) => setTimeout(() => r([]), 50)) as Promise<never[]>
    );

    const { result, rerender } = renderHook(
      ({ token }: { token: number }) =>
        useLiveQuerySafe(() => BudgetRepository.getAll(), [token], [] as never[]),
      { initialProps: { token: 0 } }
    );

    // Before the first emission: seeded result, no first result yet.
    expect(result.current.hasFirstResult).toBe(false);
    expect(result.current.result).toEqual([]);

    // After the first emission.
    await waitFor(() => expect(result.current.hasFirstResult).toBe(true));
    expect(result.current.error).toBeNull();

    // A resubscription (dep change) keeps the last result — and therefore
    // keeps hasFirstResult true immediately (no skeleton flash on refetch).
    rerender({ token: 1 });
    expect(result.current.hasFirstResult).toBe(true);
    await waitFor(() => expect(result.current.hasFirstResult).toBe(true));
  });

  it('useLiveQuerySafe: an error before any success leaves hasFirstResult false', async () => {
    vi.spyOn(BudgetRepository, 'getAll').mockRejectedValue(new Error('IndexedDB unavailable'));
    const { result } = renderHook(() =>
      useLiveQuerySafe(() => BudgetRepository.getAll(), [], [] as never[])
    );
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.hasFirstResult).toBe(false);
  });

  it('ClassicDashboard: pending first load renders skeletons (animate-pulse), not content', async () => {
    vi.spyOn(BudgetRepository, 'getAll').mockImplementation(
      () => new Promise(() => {}) as Promise<never>
    );
    const { container } = render(
      <MemoryRouter>
        <ClassicDashboard />
      </MemoryRouter>
    );

    // Skeletons are visible while the first result is pending — the skeleton
    // banner (h-40) is unique to the loading layout (the loaded page has a
    // small green status dot that also pulses).
    await waitFor(() => expect(container.querySelector('div.h-40.animate-pulse')).not.toBeNull());
    // And no error state — nothing has failed.
    expect(errorStateIn(container)).toBeNull();
  });

  it('ClassicDashboard: early failure renders ErrorState, NOT an eternal skeleton; retry recovers', async () => {
    const spy = vi.spyOn(BudgetRepository, 'getAll').mockRejectedValueOnce(
      new Error('IndexedDB unavailable')
    );
    const { container } = render(
      <MemoryRouter>
        <ClassicDashboard />
      </MemoryRouter>
    );

    // Failure wins over skeletons (Directive 16 contract preserved).
    await waitFor(() => expect(errorStateIn(container)).not.toBeNull(), { timeout: 5000 });
    expect(container.querySelector('div.h-40.animate-pulse')).toBeNull();

    // Retry: the mock is exhausted, so the resubscription succeeds — the
    // first result arrives, loading finishes, and the real content shows.
    const retryBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('إعادة المحاولة')
    );
    expect(retryBtn).toBeDefined();
    await act(async () => {
      fireEvent.click(retryBtn as Element);
    });

    await waitFor(() => expect(errorStateIn(container)).toBeNull(), { timeout: 5000 });
    expect(container.querySelector('div.h-40.animate-pulse')).toBeNull();
    // The rejected call happened, and at least one later call succeeded
    // (Dexie liveQuery retries on its own after a rejection, so the exact
    // count is not part of this contract — the visible states are).
    expect(spy.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('AdvisorPage: early failure renders ErrorState, NOT an eternal skeleton', async () => {
    vi.spyOn(BudgetRepository, 'getAll').mockRejectedValue(new Error('IndexedDB unavailable'));
    const { container } = render(
      <MemoryRouter>
        <AdvisorPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(errorStateIn(container)).not.toBeNull(), { timeout: 5000 });
    // The advisor must not be trapped in skeletons by the (now live)
    // `if (homeData.isLoading) return;` guard in useAdvisorData.
    expect(container.querySelector('.animate-pulse')).toBeNull();
  });

  it('useAdvisorData: a total early home failure (no query ever succeeds) does not stall the analysis effect', async () => {
    // The `homeData.isLoading && !homeData.error` guard, plus `homeData.error`
    // in the effect deps: when EVERY query feeding the effect's deps rejects
    // from the start (a broken DB), `isLoading` stays true forever and NO
    // other dep ever changes identity — without `error` in the deps the
    // effect would never re-run and the advisor would hang in "waiting"
    // forever. The analysis must still run to completion on what is left
    // (its own TransactionRepository.getAll(300) is healthy and succeeds).
    const ERR = new Error('IndexedDB unavailable');
    vi.spyOn(BudgetRepository, 'getAll').mockRejectedValue(ERR);        // budgets dep
    vi.spyOn(GoalRepository, 'getAll').mockRejectedValue(ERR);          // goals dep
    vi.spyOn(AccountRepository, 'getTotalBalance').mockRejectedValue(ERR); // balance dep
    vi.spyOn(StatisticsService, 'getMonthlySummary').mockRejectedValue(ERR); // monthlyStats dep
    vi.spyOn(TransactionRepository, 'getRecent').mockRejectedValue(ERR); // isLoading contribution
    const { result } = renderHook(() => useAdvisorData());
    await waitFor(() => expect(result.current.isAdvisorLoading).toBe(false), { timeout: 5000 });
    expect(result.current.error).not.toBeNull();
  });
});

