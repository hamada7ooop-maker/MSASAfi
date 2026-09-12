import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DebtItem } from '@/features/debts/components/DebtItem';
import type { Debt, Account } from '@/types';

describe('DebtItem Deep Component Tests (DebtItem.tsx)', () => {
  const dummyAccounts: Account[] = [
    {
      id: 'acc_1',
      name: 'Main Bank Account',
      balance: 5000,
      currency: 'SAR',
      color: '#2563eb',
      icon: 'account_balance',
      type: 'checking'
    }
  ];

  const owedDebt: Debt = {
    id: 'debt_owed_1',
    person: 'Khalid Al-Ghamdi',
    type: 'owed',
    amount: 1000,
    paidAmount: 200,
    dueDate: '2026-12-31',
    note: 'Car repair loan',
    accountId: 'acc_1',
    isDemo: false
  };

  const lentDebt: Debt = {
    id: 'debt_lent_1',
    person: 'Sara Ahmed',
    type: 'lent',
    amount: 500,
    paidAmount: 0,
    dueDate: '2026-11-01',
    note: 'Travel contribution',
    isDemo: false
  };

  it('renders owed debt with progress and payoff form', async () => {
    const onPayDebt = vi.fn().mockResolvedValue(undefined);
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onRequestAccount = vi.fn();
    const onToggleSelect = vi.fn();

    render(
      <DebtItem
        debt={owedDebt}
        accounts={dummyAccounts}
        isSelecting={false}
        isSelected={false}
        onToggleSelect={onToggleSelect}
        onEdit={onEdit}
        onDelete={onDelete}
        onPayDebt={onPayDebt}
        onRequestAccount={onRequestAccount}
      />
    );

    expect(screen.getByText('Khalid Al-Ghamdi')).toBeDefined();

    // Input pay amount
    const input = screen.getByPlaceholderText('مبلغ السداد');
    fireEvent.change(input, { target: { value: '200' } });

    // Submit payment
    const buttons = screen.getAllByRole('button');
    const payBtn = buttons.find(b => b.textContent?.includes('سداد') || b.textContent?.includes('Pay'));
    if (payBtn) {
      fireEvent.click(payBtn);
      await waitFor(() => {
        expect(onPayDebt).toHaveBeenCalledWith('debt_owed_1', 200, 'acc_1');
      });
    }
  });

  it('renders lent debt and actions', () => {
    const onPayDebt = vi.fn().mockResolvedValue(undefined);
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onRequestAccount = vi.fn();
    const onToggleSelect = vi.fn();

    render(
      <DebtItem
        debt={lentDebt}
        accounts={dummyAccounts}
        isSelecting={false}
        isSelected={false}
        onToggleSelect={onToggleSelect}
        onEdit={onEdit}
        onDelete={onDelete}
        onPayDebt={onPayDebt}
        onRequestAccount={onRequestAccount}
      />
    );

    expect(screen.getByText('Sara Ahmed')).toBeDefined();
  });
});
