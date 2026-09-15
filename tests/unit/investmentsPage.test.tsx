import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { Investments } from '@/features/investments/components/Investments';
import { db as DB } from '@/core/db/core';
import { bridge } from '@/core/AppBridge';
import type { Investment } from '@/types';

/**
 * Characterization tests for the investments screen (505 lines), written
 * BEFORE the decomposition into InvestmentModal / InvestmentCard / the
 * metrics helper.
 *
 * The substance under protection:
 *   1. The portfolio summary card's arithmetic (totals, profit, profit %)
 *      and its up/down trend icon.
 *   2. Per-card figures: value, profit %, trend icon.
 *   3. Selection mode: card click toggles selection instead of opening the
 *      editor; the bulk bar asks through the confirm sheet and deletes.
 *   4. The modal's three exits: save (create and update), in-modal delete
 *      with its own confirm step, and the name/cost validation gate.
 *
 * Amounts are chosen so every total is unique: cost 22000, value 25400,
 * profit +3400 → 15.45%.
 */

vi.mock('../../src/core/AppBridge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/core/AppBridge')>();
  return { ...actual, bridge: { ...actual.bridge, confirmSheet: vi.fn() } };
});

vi.mock('../../src/core/loyalty', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/core/loyalty')>();
  return { ...actual, checkMilestone: vi.fn() };
});

// The doughnut chart has its own lazy-loader; null keeps the page test off
// canvas territory (the chart theme is pinned elsewhere).
vi.mock('../../src/core/charts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/core/charts')>();
  return { ...actual, getChart: vi.fn(async () => null) };
});

const clean = (s: string | null | undefined) => (s || '').replace(/\s+/g, ' ').trim();
const digitsOf = (s: string) => s.replace(/[^\d]/g, '');
const screenText = (c: HTMLElement) => clean(c.textContent);

const INVESTMENTS: Investment[] = [
  { id: 'inv_stocks', name: 'أسهم أبل', type: 'stocks', cost: 10000, value: 15000 },
  { id: 'inv_crypto', name: 'بيتكوين', type: 'crypto', cost: 8000, value: 6000 },
  { id: 'inv_gold', name: 'ذهب سبائك', type: 'gold', cost: 4000, value: 4400 },
];
// Totals: cost 22000 · value 25400 · profit +3400 → 15.45%.
// Cards: +50.00% · −25.00% · +10.00%.

const LABEL = {
  totalValue: 'إجمالي قيمة المحفظة',
  totalCost: 'إجمالي التكلفة',
  empty: 'لا توجد استثمارات حتى الآن',
  addFirst: '+ أضف أول استثمار',
  bulkSelected: 'استثمارات مختارة',
  deleteMany: 'حذف 1 استثمارات مختارة؟',
  add: 'إضافة استثمار',
  edit: 'تعديل الاستثمار',
  save: 'حفظ',
  confirmDelete: 'تأكيد',
  namePlaceholder: 'e.g. Apple Stocks',
} as const;

async function seed(rows: Investment[] = INVESTMENTS) {
  await DB.transaction('rw', DB.tables, async () => {
    for (const t of DB.tables) await t.clear();
  });
  if (rows.length) await DB.investments.bulkPut(rows as never);
  await new Promise((r) => setTimeout(r, 0));
}

const renderScreen = () => render(<Investments />);

const addButton = (c: HTMLElement): HTMLElement => {
  const btn = Array.from(c.querySelectorAll('button')).find(
    (b) => clean(b.textContent) === 'add'
  );
  if (!btn) throw new Error('add button not found');
  return btn as HTMLElement;
};

/** The selection-mode toggle (checklist ↔ close). */
const selectionToggle = (c: HTMLElement): HTMLElement => {
  const btn = Array.from(c.querySelectorAll('button')).find((b) =>
    ['checklist', 'close'].includes(clean(b.textContent))
  );
  if (!btn) throw new Error('selection toggle not found');
  return btn as HTMLElement;
};

/** An investment card by name (cards carry role=button). */
const cardByName = (c: HTMLElement, name: string): HTMLElement => {
  const card = Array.from(c.querySelectorAll('[role="button"]')).find((el) =>
    (el.textContent || '').includes(name)
  );
  if (!card) throw new Error(`card "${name}" not found`);
  return card as HTMLElement;
};

/** The portfolio summary card — the block that carries the total value. */
const summaryCard = (c: HTMLElement): string => {
  const blocks = Array.from(c.querySelectorAll('div')).filter((d) =>
    screenText(d).includes(LABEL.totalValue)
  );
  if (!blocks.length) throw new Error('summary card not rendered');
  return screenText(blocks[blocks.length - 1]);
};

/** The bottom-sheet modal (fixed overlay) once open. */
const modal = (): HTMLElement => {
  const el = document.querySelector('.fixed.inset-0.z-\\[200\\]');
  if (!el) throw new Error('modal not open');
  return el as HTMLElement;
};

const buttonByText = (root: HTMLElement, text: string): HTMLElement => {
  const btn = Array.from(root.querySelectorAll('button')).find((b) =>
    (b.textContent || '').includes(text)
  );
  if (!btn) throw new Error(`button "${text}" not found`);
  return btn as HTMLElement;
};

const confirmSheetMock = () => vi.mocked(bridge.confirmSheet);

describe('Investments screen (characterization, pre-decomposition)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await seed();
  });

  it('summary card: 25400 value · 22000 cost · +3400 profit · 15.45% · trending up', async () => {
    const { container } = renderScreen();
    const summary = await waitFor(() => {
      const txt = summaryCard(container);
      expect(digitsOf(txt)).toContain('25400');
      return txt;
    });
    expect(digitsOf(summary)).toContain('22000');
    expect(digitsOf(summary)).toContain('3400');
    expect(summary).toContain('15.45%');
    expect(summary).toContain('trending_up');
  });

  it('cards show value and profit percent with the right trend icon', async () => {
    const { container } = renderScreen();
    await waitFor(() => expect(cardByName(container, 'أسهم أبل')).toBeTruthy());
    const stocks = screenText(cardByName(container, 'أسهم أبل'));
    const crypto = screenText(cardByName(container, 'بيتكوين'));
    const gold = screenText(cardByName(container, 'ذهب سبائك'));
    expect(digitsOf(stocks)).toContain('15000');
    expect(stocks).toContain('50.00%');
    expect(stocks).toContain('trending_up');
    expect(digitsOf(crypto)).toContain('6000');
    expect(crypto).toContain('-25.00%');
    expect(crypto).toContain('trending_down');
    expect(digitsOf(gold)).toContain('4400');
    expect(gold).toContain('10.00%');
  });

  it('empty portfolio explains itself and offers the first add', async () => {
    await seed([]);
    const { container } = renderScreen();
    await waitFor(() => {
      expect(screenText(container)).toContain(LABEL.empty);
      expect(screenText(container)).toContain(LABEL.addFirst);
      expect(screenText(container)).toContain('monitoring');
    });
  });

  it('selection mode: card clicks toggle selection, not the editor; bulk delete confirms then removes', async () => {
    const { container } = renderScreen();
    await waitFor(() => expect(cardByName(container, 'بيتكوين')).toBeTruthy());

    fireEvent.click(selectionToggle(container));
    // Card click in selection mode toggles the ring, no modal.
    fireEvent.click(cardByName(container, 'بيتكوين'));
    expect(document.querySelector('.fixed.inset-0.z-\\[200\\]')).toBeNull();
    await waitFor(() => {
      expect(screenText(container)).toContain(LABEL.bulkSelected);
    });

    // Bulk delete asks through the sheet with the count interpolated.
    fireEvent.click(buttonByText(container, 'delete'));
    expect(confirmSheetMock()).toHaveBeenCalledTimes(1);
    expect(confirmSheetMock().mock.calls[0][0]).toContain(LABEL.deleteMany);

    const [, onConfirm] = confirmSheetMock().mock.calls[0];
    await onConfirm();
    await waitFor(() => {
      expect(() => cardByName(container, 'بيتكوين')).toThrow();
    });
    expect(await DB.investments.count()).toBe(2);
    // Selection mode resets with the sheet.
    await waitFor(() => expect(screenText(container)).not.toContain(LABEL.bulkSelected));
  });

  it('add flow: modal opens empty, crypto type selects, save persists a new row', async () => {
    const { container } = renderScreen();
    await waitFor(() => expect(cardByName(container, 'أسهم أبل')).toBeTruthy());

    fireEvent.click(addButton(container));
    const sheet = await waitFor(() => {
      expect(screenText(modal())).toContain(LABEL.add);
      return modal();
    });
    // 6 type buttons render in the grid.
    expect(screenText(sheet)).toContain('₿');

    fireEvent.click(buttonByText(sheet, '₿'));
    const nameInput = sheet.querySelector(
      `input[placeholder="${LABEL.namePlaceholder}"]`
    ) as HTMLInputElement;
    const numberInputs = Array.from(
      sheet.querySelectorAll('input[inputmode="decimal"]')
    ) as HTMLInputElement[];
    fireEvent.change(nameInput, { target: { value: 'عملة رقمية جديدة' } });
    fireEvent.change(numberInputs[0], { target: { value: '1000' } });
    fireEvent.change(numberInputs[1], { target: { value: '1200' } });
    fireEvent.click(buttonByText(sheet, LABEL.save));

    await waitFor(() => {
      expect(document.querySelector('.fixed.inset-0.z-\\[200\\]')).toBeNull();
    });
    const rows = await DB.investments.toArray();
    expect(rows).toHaveLength(4);
    const created = rows.find((r) => r.name === 'عملة رقمية جديدة');
    expect(created?.type).toBe('crypto');
    expect(created?.cost).toBe(1000);
    expect(created?.value).toBe(1200);
  });

  it('save is gated: no name, no row', async () => {
    const { container } = renderScreen();
    await waitFor(() => expect(cardByName(container, 'أسهم أبل')).toBeTruthy());

    fireEvent.click(addButton(container));
    const sheet = await waitFor(() => modal());
    const numberInputs = Array.from(
      sheet.querySelectorAll('input[inputmode="decimal"]')
    ) as HTMLInputElement[];
    fireEvent.change(numberInputs[0], { target: { value: '500' } });
    fireEvent.click(buttonByText(sheet, LABEL.save));

    // Modal stays open, nothing persisted.
    expect(document.querySelector('.fixed.inset-0.z-\\[200\\]')).toBeTruthy();
    expect(await DB.investments.count()).toBe(3);
  });

  it('edit flow: card click opens the editor prefilled; save updates the row', async () => {
    const { container } = renderScreen();
    await waitFor(() => expect(cardByName(container, 'ذهب سبائك')).toBeTruthy());

    fireEvent.click(cardByName(container, 'ذهب سبائك'));
    const sheet = await waitFor(() => {
      expect(screenText(modal())).toContain(LABEL.edit);
      return modal();
    });
    const nameInput = sheet.querySelector(
      `input[placeholder="${LABEL.namePlaceholder}"]`
    ) as HTMLInputElement;
    expect(nameInput.value).toBe('ذهب سبائك');

    const numberInputs = Array.from(
      sheet.querySelectorAll('input[inputmode="decimal"]')
    ) as HTMLInputElement[];
    fireEvent.change(numberInputs[1], { target: { value: '5000' } });
    fireEvent.click(buttonByText(sheet, LABEL.save));

    await waitFor(() => {
      expect(document.querySelector('.fixed.inset-0.z-\\[200\\]')).toBeNull();
    });
    const row = await DB.investments.get('inv_gold');
    expect(row?.value).toBe(5000);
    // The card reflects it.
    await waitFor(() => {
      expect(digitsOf(screenText(cardByName(container, 'ذهب سبائك')))).toContain('5000');
    });
  });

  it('in-modal delete: trash → confirm step → row removed', async () => {
    const { container } = renderScreen();
    await waitFor(() => expect(cardByName(container, 'بيتكوين')).toBeTruthy());

    fireEvent.click(cardByName(container, 'بيتكوين'));
    const sheet = await waitFor(() => modal());
    fireEvent.click(buttonByText(sheet, 'delete'));
    // The confirm step replaces the footer.
    await waitFor(() => {
      expect(screenText(sheet)).toContain(LABEL.confirmDelete);
    });
    fireEvent.click(buttonByText(sheet, LABEL.confirmDelete));

    await waitFor(() => {
      expect(document.querySelector('.fixed.inset-0.z-\\[200\\]')).toBeNull();
    });
    expect(await DB.investments.count()).toBe(2);
    await waitFor(() => {
      expect(() => cardByName(container, 'بيتكوين')).toThrow();
    });
  });
});
