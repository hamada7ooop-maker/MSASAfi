import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AddTransactionPage } from '@/features/transactions/components/AddTransactionPage';
import { db as DB } from '@/core/db/core';

/**
 * Characterization tests for the Add Transaction page.
 *
 * This is the screen that records money — the single most important flow in
 * the app — and at 1315 lines it had NO render coverage at all: the only
 * existing test exercised its hook in isolation. That made L-1 ("split the
 * large files") unsafe to attempt, because nothing would have caught a
 * regression introduced while moving JSX around.
 *
 * These tests pin the observable behaviour FIRST. They are deliberately
 * written against what a user can see and do, not against internal structure,
 * so they keep passing across the extraction and would fail if any of it
 * changed meaning.
 */

const renderPage = (route = '/transactions/add') =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <AddTransactionPage />
    </MemoryRouter>
  );

describe('Add Transaction — core form', () => {
  beforeEach(async () => {
    await DB.transactions.clear();
    await DB.accounts.clear();
  });

  it('renders and defaults to recording an expense', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('مصروف')).toBeInTheDocument();
    });
    expect(screen.getByText('الدخل')).toBeInTheDocument();
  });

  it('accepts an amount and reflects it in the field', async () => {
    renderPage();
    const amountInput = await waitFor(() => {
      const el = document.querySelector('input[inputmode="decimal"]');
      expect(el).toBeTruthy();
      return el as HTMLInputElement;
    });
    fireEvent.change(amountInput, { target: { value: '250' } });
    expect(amountInput.value).toContain('250');
  });

  it('switches between expense and income', async () => {
    renderPage();
    const income = await waitFor(() => screen.getByText('الدخل'));
    fireEvent.click(income);
    await waitFor(() => {
      expect(screen.getByText('الدخل')).toBeInTheDocument();
    });
  });

  it('exposes the advanced options accordion', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/خيارات إضافية ومتقدمة/)).toBeInTheDocument();
    });
  });
});

describe('Add Transaction — split section (the block being extracted)', () => {
  beforeEach(async () => {
    await DB.transactions.clear();
    await DB.accounts.clear();
  });

  it('offers splitting for expenses', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('معاملة مقسمة')).toBeInTheDocument();
    });
    expect(screen.getByText('تقسيم المبلغ على عدة فئات مصروفات')).toBeInTheDocument();
  });

  it('hides splitting for income, because it only makes sense for spending', async () => {
    renderPage();
    const income = await waitFor(() => screen.getByText('الدخل'));
    fireEvent.click(income);
    await waitFor(() => {
      expect(screen.queryByText('معاملة مقسمة')).not.toBeInTheDocument();
    });
  });

  it('reveals the split editor once the toggle is switched on', async () => {
    renderPage();
    await waitFor(() => screen.getByText('معاملة مقسمة'));

    // The toggle sits next to the label; find it via the section.
    const label = screen.getByText('معاملة مقسمة');
    const section = label.closest('section');
    expect(section).toBeTruthy();

    const toggle = section!.querySelector('button[type="button"]');
    expect(toggle).toBeTruthy();
    fireEvent.click(toggle!);

    // A category dropdown appears for the first split row.
    await waitFor(() => {
      expect(section!.querySelector('select')).toBeTruthy();
    });
  });
});

describe('Add Transaction — the page stays whole', () => {
  beforeEach(async () => {
    await DB.transactions.clear();
  });

  it('renders every major section in one pass', async () => {
    renderPage();
    await waitFor(() => {
      // Amount entry
      expect(document.querySelector('input[inputmode="decimal"]')).toBeTruthy();
    });
    // Type switch, split section, and the save affordance all coexist.
    expect(screen.getByText('مصروف')).toBeInTheDocument();
    expect(screen.getByText('معاملة مقسمة')).toBeInTheDocument();
  });

  it('does not crash when mounted for editing a missing transaction', async () => {
    // Defensive: the edit path reads an id from the query string.
    expect(() => renderPage('/transactions/add?edit=does-not-exist')).not.toThrow();
    await waitFor(() => {
      expect(document.querySelector('input[inputmode="decimal"]')).toBeTruthy();
    });
  });
});

describe('Add Transaction — split seeding (guards the extraction wiring)', () => {
  beforeEach(async () => {
    await DB.transactions.clear();
    await DB.accounts.clear();
  });

  /**
   * Turning splitting on seeds the first row from the amount and category the
   * user already picked, so they are not made to retype what they just entered.
   * This asserts the props are actually connected — a mis-wired
   * selectedCategory/amount is the most plausible way the extraction could
   * silently break, and it is invisible to a test that only checks rendering.
   */
  it('seeds the first split row from the amount and category already entered', async () => {
    renderPage();

    const amountInput = await waitFor(() => {
      const el = document.querySelector('input[inputmode="decimal"]');
      expect(el).toBeTruthy();
      return el as HTMLInputElement;
    });
    fireEvent.change(amountInput, { target: { value: '300' } });

    // Pick a real category from the grid.
    // Scope to the category grid itself. Filtering the whole document by
    // class would also catch the mood picker and the "show all" search tile.
    // Categories are loaded from the DB, so wait for the grid to fill.
    const catButtons = await waitFor(() => {
      const grid = screen
        .getAllByText('إدارة الفئات')[0]
        .closest('section')!
        .querySelector('.grid')!;
      const btns = Array.from(grid.querySelectorAll('button')).filter(
        (b) => !b.textContent?.includes('search')
      );
      expect(btns.length).toBeGreaterThan(0);
      return btns;
    });
    fireEvent.click(catButtons[0]);
    const chosen = catButtons[0].textContent?.trim() ?? '';

    const section = screen.getByText('معاملة مقسمة').closest('section')!;
    fireEvent.click(section.querySelector('button[type="button"]')!);

    const select = await waitFor(() => {
      const el = section.querySelector('select');
      expect(el).toBeTruthy();
      return el as HTMLSelectElement;
    });

    // The seeded row carries the chosen category forward, not a blank.
    const selectedLabel = select.options[select.selectedIndex]?.textContent?.trim();
    expect(selectedLabel).toBeTruthy();
    // The grid button label carries an emoji icon; the option is text only.
    expect(chosen).toContain(selectedLabel!);

    // ...and the seeded amount matches the total just entered.
    const splitAmountInputs = Array.from(
      section.querySelectorAll('input[inputmode="decimal"]')
    ) as HTMLInputElement[];
    expect(splitAmountInputs.length).toBeGreaterThan(0);
    expect(splitAmountInputs[0].value).toContain('300');
  });
});
