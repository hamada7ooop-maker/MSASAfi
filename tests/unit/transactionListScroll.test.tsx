import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TransactionList } from '../../src/features/transactions/components/TransactionList';
import { db as DB } from '@/core/db/core';

describe('TransactionList Infinite Scroll & Rendering Unit Tests', () => {
  beforeEach(async () => {
    await DB.transactions.clear();
    await DB.accounts.clear();
    await DB.categories.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={['/transactions']}>
      {children}
    </MemoryRouter>
  );

  it('renders all loaded transactions directly without synthetic virtual scroll spacers', async () => {
    // Seed 10 transactions
    const now = new Date();
    for (let i = 1; i <= 10; i++) {
      await DB.transactions.put({
        id: `tx_test_${i}`,
        amount: i * 50,
        type: 'expense',
        category: 'طعام',
        description: `وجبة غداء ${i}`,
        date: new Date(now.getTime() - i * 3600000).toISOString(),
        createdAt: new Date(now.getTime() - i * 3600000).toISOString(),
        isDraft: false,
        isDeleted: false
      });
    }

    const { container } = render(<TransactionList />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('وجبة غداء 1')).toBeInTheDocument();
    });

    // Ensure all 10 transactions are in the DOM
    for (let i = 1; i <= 10; i++) {
      expect(screen.getByText(`وجبة غداء ${i}`)).toBeInTheDocument();
    }

    // Verify no collapsing virtual scroll spacers exist
    const spacers = container.querySelectorAll('div[aria-hidden="true"]');
    expect(spacers.length).toBe(0);
  });

  it('shows empty state gracefully when no transactions exist', async () => {
    render(<TransactionList />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText(/لا توجد معاملات|No transactions/i)).toBeInTheDocument();
    });
  });
});
