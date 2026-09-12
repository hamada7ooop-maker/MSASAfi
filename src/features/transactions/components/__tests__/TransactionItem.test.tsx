import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TransactionItem } from '../TransactionItem';
import type { Transaction } from '../../../../types';

describe('TransactionItem Component Tests', () => {
  it('renders expense transaction with correct category and description', () => {
    const tx: Transaction = {
      id: 'tx_test_1',
      description: 'Supermarket Grocery Run',
      amount: 175.50,
      type: 'expense',
      category: 'مواد غذائية',
      date: '2026-05-15',
      account: 'Main Bank'
    };

    render(
      <MemoryRouter>
        <TransactionItem transaction={tx} isSelecting={false} />
      </MemoryRouter>
    );

    expect(screen.getByText('Supermarket Grocery Run')).toBeInTheDocument();
    expect(screen.getByText('مواد غذائية')).toBeInTheDocument();
  });

  it('renders income transaction with correct badge', () => {
    const tx: Transaction = {
      id: 'tx_income_1',
      description: 'Monthly Salary',
      amount: 15000,
      type: 'income',
      category: 'راتب',
      date: '2026-05-01'
    };

    render(
      <MemoryRouter>
        <TransactionItem transaction={tx} isSelecting={false} />
      </MemoryRouter>
    );

    expect(screen.getByText('Monthly Salary')).toBeInTheDocument();
    expect(screen.getByText('راتب')).toBeInTheDocument();
  });
});
