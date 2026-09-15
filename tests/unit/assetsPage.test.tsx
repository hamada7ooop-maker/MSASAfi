import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { Assets } from '@/features/assets/components/Assets';
import { db as DB } from '@/core/db/core';
import { bridge } from '@/core/AppBridge';
import type { Asset } from '@/types';

/**
 * Characterization tests for the assets screen (591 lines), written BEFORE
 * the decomposition into AssetCard / AssetSummaryPanel /
 * AssetCategoryFilter / the shared PDF export service.
 *
 * The substance under protection:
 *   1. The summary panel aggregates the ENGINE's numbers (purchase prices,
 *      accumulated depreciation, book values, active warranties) — a refactor
 *      that renders cards but miscounts the panel is the realistic failure.
 *   2. Category filtering actually filters.
 *   3. The card wiring: click → detail modal state, edit → prefilled form,
 *      delete → confirm sheet → repository delete.
 *
 * Lifespans are 1 year with purchases >1 year ago, so the engine's
 * fractional-year interpolation lands on the exact P−S branch — every
 * expected figure is an integer no interpolation can smear.
 */

vi.mock('../../src/core/AppBridge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/core/AppBridge')>();
  return { ...actual, bridge: { ...actual.bridge, confirmSheet: vi.fn() } };
});

const clean = (s: string | null | undefined) => (s || '').replace(/\s+/g, ' ').trim();
const digitsOf = (s: string) => s.replace(/[^\d]/g, '');
const screenText = (c: HTMLElement) => clean(c.textContent);

const iso = (daysFromNow: number) =>
  new Date(Date.now() + daysFromNow * 86400000).toISOString().slice(0, 10);

/** lifespans are 1y and purchases are >1y old → book value === salvageValue exactly. */
const ASSETS: Asset[] = [
  { id: 'a_villa', name: 'فيلا الرياض', category: 'real_estate', purchasePrice: 600000, purchaseDate: iso(-375), lifespanYears: 1, salvageValue: 100000, warrantyExpiry: iso(500), depreciationMethod: 'straight_line' },
  { id: 'a_car', name: 'لكزس ES', category: 'vehicle', purchasePrice: 150000, purchaseDate: iso(-380), lifespanYears: 1, salvageValue: 30000, warrantyExpiry: iso(-30), depreciationMethod: 'straight_line' },
  { id: 'a_laptop', name: 'ماك بوك برو', category: 'electronics', purchasePrice: 8000, purchaseDate: iso(-370), lifespanYears: 1, salvageValue: 1000, depreciationMethod: 'straight_line' },
];
// Totals: purchase 758000 · depreciation 627000 · book 131000 · active warranties 1.

const LABEL = {
  title: 'تتبع الأصول والممتلكات',
  count: '3 أصول مسجلة في محفظتك',
  totalPurchase: 'إجمالي القيمة الشرائية',
  totalDepreciation: 'الاستهلاك المتراكم',
  totalBook: 'صافي القيمة الحالية',
  activeWarranties: 'ضمانات نشطة',
  warrantyActive: 'الضمان نشط',
  warrantyExpired: 'الضمان منتهي',
  consumed: 'مستهلك 100%',
  emptyInCategory: 'لا يوجد أصول مسجلة ضمن هذه الفئة',
  addNew: 'إضافة أصل جديد',
  editAsset: 'تعديل أصل',
  namePlaceholder: 'مثال: سيارة كورولا، فيلا الرياض، ماكبوك...',
  deleteConfirm: 'هل أنت متأكد من رغبتك في حذف هذا الأصل نهائياً؟',
} as const;

async function seed() {
  await DB.transaction('rw', DB.tables, async () => {
    for (const t of DB.tables) await t.clear();
  });
  await DB.assets.bulkPut(ASSETS as never);
  await new Promise((r) => setTimeout(r, 0));
}

const renderScreen = () => render(<Assets />);

/** The header's add button — icon-only "add" ligature (no human label). */
const addButton = (c: HTMLElement): Element => {
  const btn = Array.from(c.querySelectorAll('button')).find(
    (b) => clean(b.textContent) === 'add'
  );
  if (!btn) throw new Error('add button not found');
  return btn;
};

/** The summary grid — the innermost block carrying all three totals. */
const summaryPanel = (c: HTMLElement): string => {
  const blocks = Array.from(c.querySelectorAll('div')).filter((d) => {
    const txt = screenText(d);
    return (
      txt.includes(LABEL.totalPurchase) &&
      txt.includes(LABEL.totalDepreciation) &&
      txt.includes(LABEL.totalBook)
    );
  });
  if (!blocks.length) throw new Error('summary panel not rendered');
  return screenText(blocks[blocks.length - 1]);
};

/** An asset card, identified by the asset's name (cards have role=button). */
const cardByName = (c: HTMLElement, name: string): HTMLElement => {
  const card = Array.from(c.querySelectorAll('[role="button"]')).find((el) =>
    (el.textContent || '').includes(name)
  );
  if (!card) throw new Error(`card "${name}" not found`);
  return card as HTMLElement;
};

/** The edit pencil inside a card (first button with the "edit" ligature). */
const editButtonOf = (card: HTMLElement): HTMLElement => {
  const btn = Array.from(card.querySelectorAll('button')).find(
    (b) => clean(b.textContent) === 'edit'
  );
  if (!btn) throw new Error('edit button not found on card');
  return btn as HTMLElement;
};

/** The delete trash inside a card. */
const deleteButtonOf = (card: HTMLElement): HTMLElement => {
  const btn = Array.from(card.querySelectorAll('button')).find(
    (b) => clean(b.textContent) === 'delete'
  );
  if (!btn) throw new Error('delete button not found on card');
  return btn as HTMLElement;
};

const confirmSheetMock = () => vi.mocked(bridge.confirmSheet);

describe('Assets screen (characterization, pre-decomposition)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await seed();
  });

  it('renders the header with the registered-assets count', async () => {
    const { container } = renderScreen();
    await waitFor(() => {
      expect(screenText(container)).toContain(LABEL.title);
      expect(screenText(container)).toContain(LABEL.count);
    });
  });

  it('summary panel aggregates engine numbers: 758000 purchase · 627000 depreciation · 131000 book · 1 active warranty', async () => {
    const { container } = renderScreen();
    const panel = await waitFor(() => {
      const txt = summaryPanel(container);
      expect(digitsOf(txt)).toContain('758000');
      return txt;
    });
    expect(digitsOf(panel)).toContain('627000');
    expect(digitsOf(panel)).toContain('131000');
    // The active-warranty chip sits below the grid — assert on the page.
    expect(screenText(container)).toContain(`1 ${LABEL.activeWarranties}`);
  });

  it('cards show each asset engine book value (salvage, fully depreciated) and purchase date', async () => {
    const { container } = renderScreen();
    await waitFor(() => expect(cardByName(container, 'فيلا الرياض')).toBeTruthy());
    const villa = screenText(cardByName(container, 'فيلا الرياض'));
    const car = screenText(cardByName(container, 'لكزس ES'));
    const laptop = screenText(cardByName(container, 'ماك بوك برو'));
    expect(digitsOf(villa)).toContain('100000');
    expect(digitsOf(villa)).toContain('600000');
    expect(digitsOf(car)).toContain('30000');
    expect(digitsOf(laptop)).toContain('1000');
    expect(villa).toContain(ASSETS[0].purchaseDate);
    expect(car).toContain(ASSETS[1].purchaseDate);
  });

  it('warranty badges: active for the villa, expired for the car, none for the laptop', async () => {
    const { container } = renderScreen();
    await waitFor(() => expect(cardByName(container, 'فيلا الرياض')).toBeTruthy());
    expect(screenText(cardByName(container, 'فيلا الرياض'))).toContain(LABEL.warrantyActive);
    expect(screenText(cardByName(container, 'لكزس ES'))).toContain(LABEL.warrantyExpired);
    expect(screenText(cardByName(container, 'ماك بوك برو'))).not.toContain('الضمان');
  });

  it('fully-depreciated cards read 100% consumed', async () => {
    const { container } = renderScreen();
    await waitFor(() => expect(cardByName(container, 'فيلا الرياض')).toBeTruthy());
    expect(screenText(cardByName(container, 'فيلا الرياض'))).toContain(LABEL.consumed);
    expect(screenText(cardByName(container, 'لكزس ES'))).toContain(LABEL.consumed);
  });

  it('category filter shows only matching assets, and an empty category explains itself', async () => {
    const { container } = renderScreen();
    await waitFor(() => expect(cardByName(container, 'لكزس ES')).toBeTruthy());

    const realEstate = Array.from(container.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('عقارات 🏠')
    )!;
    fireEvent.click(realEstate);

    await waitFor(() => {
      expect(cardByName(container, 'فيلا الرياض')).toBeTruthy();
      expect(() => cardByName(container, 'لكزس ES')).toThrow();
      expect(() => cardByName(container, 'ماك بوك برو')).toThrow();
    });
    // The header count reflects the WHOLE wallet, not the active filter.
    expect(screenText(container)).toContain('3 أصول مسجلة');

    const other = Array.from(container.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('أخرى 💎')
    )!;
    fireEvent.click(other);
    await waitFor(() => expect(screenText(container)).toContain(LABEL.emptyInCategory));
  });

  it('add opens the form modal in create mode; edit opens it prefilled with the asset name', async () => {
    const { container } = renderScreen();
    await waitFor(() => expect(cardByName(container, 'فيلا الرياض')).toBeTruthy());

    fireEvent.click(addButton(container) as HTMLElement);
    const title = await waitFor(() => {
      const el = document.getElementById('asset-form-title');
      expect(el).toBeTruthy();
      return el!;
    });
    expect(clean(title.textContent)).toContain(LABEL.addNew);

    // Close via Escape (the modal's own handler), then open edit on the car.
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(document.getElementById('asset-form-title')).toBeNull());

    fireEvent.click(editButtonOf(cardByName(container, 'لكزس ES')));
    await waitFor(() => {
      const el = document.getElementById('asset-form-title');
      expect(el).toBeTruthy();
      expect(clean(el!.textContent)).toContain(LABEL.editAsset);
    });
    const nameInput = document.querySelector(
      `input[placeholder="${LABEL.namePlaceholder}"]`
    ) as HTMLInputElement;
    expect(nameInput.value).toBe('لكزس ES');
  });

  it('delete asks through the confirm sheet, and confirming removes the row', async () => {
    const { container } = renderScreen();
    await waitFor(() => expect(cardByName(container, 'لكزس ES')).toBeTruthy());

    fireEvent.click(deleteButtonOf(cardByName(container, 'لكزس ES')));
    expect(confirmSheetMock()).toHaveBeenCalledTimes(1);
    const [message, onConfirm] = confirmSheetMock().mock.calls[0];
    expect(message).toContain(LABEL.deleteConfirm);

    await onConfirm();
    await waitFor(() => {
      expect(() => cardByName(container, 'لكزس ES')).toThrow();
    });
    expect(await DB.assets.count()).toBe(2);
    // The other two survive.
    expect(cardByName(container, 'فيلا الرياض')).toBeTruthy();
  });

  it('the print and PDF actions exist with stable ids', async () => {
    const { container } = renderScreen();
    await waitFor(() => expect(screenText(container)).toContain(LABEL.title));
    expect(document.getElementById('assets-print-btn')).toBeTruthy();
    expect(document.getElementById('assets-pdf-btn')).toBeTruthy();
    expect(document.getElementById('assets-print-container')).toBeTruthy();
  });
});
