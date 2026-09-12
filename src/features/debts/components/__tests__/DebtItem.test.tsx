import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DebtItem } from '../DebtItem';
import type { Debt, Account } from '../../../../types';

describe('DebtItem Component Tests', () => {
  const mockAccounts: Account[] = [
    { id: 'acc_1', name: 'Main Account', balance: 5000, color: '#3b82f6', icon: 'account_balance', type: 'bank' }
  ];

  it('renders owed debt name and remaining calculation', () => {
    const debt: Debt = {
      id: 'd_1',
      name: 'Car Installment',
      type: 'owed',
      total: 20000,
      paid: 5000,
      accountId: 'acc_1'
    };

    render(
      <DebtItem
        debt={debt}
        accounts={mockAccounts}
        isSelecting={false}
        isSelected={false}
        onToggleSelect={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onPayDebt={vi.fn().mockResolvedValue(undefined)}
        onRequestAccount={vi.fn()}
      />
    );

    expect(screen.getByText('Car Installment')).toBeInTheDocument();
  });

  it('renders lent debt properly', () => {
    const debt: Debt = {
      id: 'd_2',
      name: 'Loan to Ahmed',
      type: 'lent',
      total: 1000,
      paid: 1000,
      accountId: 'acc_1'
    };

    render(
      <DebtItem
        debt={debt}
        accounts={mockAccounts}
        isSelecting={false}
        isSelected={false}
        onToggleSelect={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onPayDebt={vi.fn().mockResolvedValue(undefined)}
        onRequestAccount={vi.fn()}
      />
    );

    expect(screen.getByText('Loan to Ahmed')).toBeInTheDocument();
  });

  it('renders edit and delete buttons and invokes callbacks even with very long names and accounts', () => {
    const onEditMock = vi.fn();
    const onDeleteMock = vi.fn();

    const longDebt: Debt = {
      id: 'd_long',
      name: 'سلفية سيارة تويوتا كامري موديل الفين واربعة وعشرين الدفعة الاخيرة الكبيرة جدا',
      person: 'عبدالرحمن محمد خالد ابراهيم بن فهد التميمي',
      type: 'owed',
      total: 50000,
      paid: 10000,
      accountId: 'acc_1'
    };

    const { container } = render(
      <DebtItem
        debt={longDebt}
        accounts={[{ id: 'acc_1', name: 'حساب بنك الراجحي للرواتب والمعاملات الحكومية', balance: 50000, color: '#3b82f6', icon: 'account_balance', type: 'bank' }]}
        isSelecting={false}
        isSelected={false}
        onToggleSelect={vi.fn()}
        onEdit={onEditMock}
        onDelete={onDeleteMock}
        onPayDebt={vi.fn().mockResolvedValue(undefined)}
        onRequestAccount={vi.fn()}
      />
    );

    // Verify card wrapper has responsive containment classes
    const cardEl = container.querySelector('.fin-card');
    expect(cardEl).not.toBeNull();
    expect(cardEl?.className).toContain('overflow-hidden');
    expect(cardEl?.className).toContain('min-w-0');
    expect(cardEl?.className).toContain('max-w-full');

    // Find and click edit button
    const editBtn = screen.getByRole('button', { name: /تعديل|Edit/i });
    expect(editBtn).toBeInTheDocument();
    editBtn.click();
    expect(onEditMock).toHaveBeenCalledTimes(1);
    expect(onEditMock).toHaveBeenCalledWith(longDebt);

    // Find and click delete button
    const deleteBtn = screen.getByRole('button', { name: /حذف|Delete/i });
    expect(deleteBtn).toBeInTheDocument();
    deleteBtn.click();
    expect(onDeleteMock).toHaveBeenCalledTimes(1);
    expect(onDeleteMock).toHaveBeenCalledWith('d_long');
  });
});

