import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GoalItem } from '../GoalItem';
import type { Goal, Account } from '../../../../types';

describe('GoalItem Component Tests', () => {
  const mockAccounts: Account[] = [
    { id: 'acc_1', name: 'Savings Account', balance: 10000, color: '#3b82f6', icon: 'savings', type: 'savings' }
  ];

  it('renders goal name and target percentage', async () => {
    const goal: Goal = {
      id: 'g_1',
      name: 'Umrah Trip',
      target: 10000,
      saved: 5000,
      accountId: 'acc_1'
    };

    render(
      <GoalItem
        goal={goal}
        accounts={mockAccounts}
        isSelecting={false}
        isSelected={false}
        onToggleSelect={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onAddDeposit={vi.fn().mockResolvedValue(goal)}
        onRequestAccount={vi.fn()}
        getGoalForecast={vi.fn().mockResolvedValue(null)}
      />
    );

    expect(screen.getByText('Umrah Trip')).toBeInTheDocument();
    // 5000 / 10000 = 50%
    expect(screen.getByText('50%')).toBeInTheDocument();
  });
});
