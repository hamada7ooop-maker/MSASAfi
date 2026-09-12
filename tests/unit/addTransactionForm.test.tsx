import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAddTransactionForm } from '../../src/features/transactions/hooks/useAddTransactionForm';
import { db as DB } from '@/core/db/core';

describe('useAddTransactionForm Hook Unit Tests', () => {
  beforeEach(async () => {
    await DB.transactions.clear();
    await DB.accounts.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={['/transactions/add']}>
      {children}
    </MemoryRouter>
  );

  it('initializes form with expected default state', () => {
    const { result } = renderHook(() => useAddTransactionForm(), { wrapper });

    expect(result.current.type).toBe('expense');
    expect(result.current.amount).toBe('');
    expect(result.current.necessity).toBe('need');
    expect(result.current.mood).toBe('neutral');
    expect(result.current.isDraft).toBe(false);
    expect(result.current.isFavorite).toBe(false);
  });

  it('updates type and input values correctly', () => {
    const { result } = renderHook(() => useAddTransactionForm(), { wrapper });

    act(() => {
      result.current.setType('income');
      result.current.setAmount('1500');
      result.current.setDescription('Bonus payment');
      result.current.setMood('happy');
    });

    expect(result.current.type).toBe('income');
    expect(result.current.amount).toBe('1500');
    expect(result.current.description).toBe('Bonus payment');
    expect(result.current.mood).toBe('happy');
  });

  it('handles calculator modal toggle state and amount setting', () => {
    const { result } = renderHook(() => useAddTransactionForm(), { wrapper });

    expect(result.current.showCalculator).toBe(false);

    act(() => {
      result.current.setShowCalculator(true);
    });

    expect(result.current.showCalculator).toBe(true);

    act(() => {
      result.current.setShowCalculator(false);
      result.current.setAmount('250.50');
    });

    expect(result.current.showCalculator).toBe(false);
    expect(result.current.amount).toBe('250.50');
  });

  it('handles cooling queue state toggle', () => {
    const { result } = renderHook(() => useAddTransactionForm(), { wrapper });

    expect(result.current.isCooling).toBe(false);

    act(() => {
      result.current.setIsCooling(true);
    });

    expect(result.current.isCooling).toBe(true);
  });
});
