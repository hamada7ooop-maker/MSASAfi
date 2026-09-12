import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BudgetItem } from '../BudgetItem';
import type { Budget } from '@/types';

describe('BudgetItem Component', () => {
  const mockBudget: Budget = {
    id: 'budget_1',
    name: 'Dining Out',
    category: 'مطاعم',
    limit: 1000,
    month: '2026-08',
  };

  it('renders budget name, percentage and amount correctly', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <BudgetItem
        budget={mockBudget}
        spent={500}
        limit={1000}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    expect(screen.getByText('Dining Out')).toBeDefined();
    expect(screen.getByText('50%')).toBeDefined();
  });

  it('triggers onEdit and onDelete callbacks when buttons are clicked', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <BudgetItem
        budget={mockBudget}
        spent={800}
        limit={1000}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    const editBtn = screen.getByLabelText('Edit budget');
    fireEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledWith(mockBudget);

    const deleteBtn = screen.getByLabelText('Delete budget');
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith('budget_1');
  });
});
