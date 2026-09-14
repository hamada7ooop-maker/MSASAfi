import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Bills } from '@/features/bills/components/Bills';
import { db as DB } from '@/core/db/core';
import type { Bill, Subscription } from '@/types';

/**
 * Accessibility of the icon-only controls on the bills screen.
 *
 * ## The problem
 *
 * Nine buttons across Bills / BillModal / SubModal render nothing but a
 * material-symbols ligature. Because the ligature is real text in the DOM, a
 * screen reader does not announce "edit bill" — it reads the literal string
 * "edit", and for the paid toggle it reads "check_circle". The user hears
 * fragments of an icon font.
 *
 * That also made these buttons unfindable by accessible name in tests, which
 * is why `bills.test.tsx` has to match on the raw ligature text.
 *
 * ## What is asserted
 *
 * Every button reachable on this screen must expose an accessible name that is
 * NOT its ligature, and the decorative span must be hidden from the
 * accessibility tree so the ligature is not appended to that name.
 */

const clean = (s: string | null | undefined) => (s || '').replace(/\s+/g, ' ').trim();

/** Ligatures used on this screen; none of them is an acceptable spoken name. */
const LIGATURES = [
  'add',
  'edit',
  'delete',
  'close',
  'check_circle',
  'hourglass_empty',
];

const iso = (d: number) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);

const BILLS: Bill[] = [
  { id: 'b1', name: 'كهرباء', amount: 1250, dueDate: iso(-10), recurring: 'monthly', icon: 'bolt' },
  { id: 'b2', name: 'إنترنت', amount: 890, dueDate: iso(5), recurring: 'monthly', icon: 'wifi' },
  { id: 'b3', name: 'إيجار', amount: 3000, dueDate: iso(-2), recurring: 'monthly', icon: 'home', isPaid: true, paidDate: iso(-1) },
];
const SUBS: Subscription[] = [
  { id: 's1', name: 'نتفلكس', amount: 75, renewDate: 12, icon: 'movie' } as never,
];

const renderScreen = () =>
  render(
    <MemoryRouter>
      <Bills />
    </MemoryRouter>
  );

/**
 * The accessible name of a button, approximated the way a screen reader
 * computes it: aria-label wins, then title, then the text content that is not
 * hidden from the accessibility tree.
 */
const accessibleName = (btn: Element): string => {
  const aria = btn.getAttribute('aria-label');
  if (aria) return clean(aria);
  const title = btn.getAttribute('title');
  if (title) return clean(title);
  const clone = btn.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
  return clean(clone.textContent);
};

const allButtons = (c: HTMLElement) => Array.from(c.querySelectorAll('button'));

const offenders = (c: HTMLElement) =>
  allButtons(c)
    .map((b) => ({ name: accessibleName(b), ligature: clean(b.textContent) }))
    .filter((x) => x.name === '' || LIGATURES.includes(x.name))
    .map((x) => `"${x.name}" (ligature: ${x.ligature})`);

async function seed() {
  await DB.transaction('rw', DB.tables, async () => {
    for (const t of DB.tables) await t.clear();
  });
  await DB.bills.bulkPut(BILLS as never);
  await DB.subscriptions.bulkPut(SUBS as never);
  await new Promise((r) => setTimeout(r, 0));
}

describe('Bills — icon-only button accessibility', () => {
  beforeEach(seed);

  it('every button on the bills list has a spoken name that is not a ligature', async () => {
    const { container } = renderScreen();
    await waitFor(() => expect(clean(container.textContent)).toContain('كهرباء'));

    const bad = offenders(container);
    expect(
      bad,
      bad.length
        ? `Screen readers announce the material ligature verbatim for these ` +
          `buttons. Add an aria-label (and aria-hidden on the icon span):\n` +
          bad.map((b) => `  - ${b}`).join('\n')
        : undefined
    ).toEqual([]);
  });

  it('every button on the subscriptions tab has a spoken name', async () => {
    const { container } = renderScreen();
    await waitFor(() => expect(clean(container.textContent)).toContain('كهرباء'));

    const subsTab = allButtons(container).find((b) =>
      clean(b.textContent).startsWith('الاشتراكات الدورية')
    );
    expect(subsTab).toBeTruthy();
    fireEvent.click(subsTab as Element);
    await waitFor(() => expect(clean(container.textContent)).toContain('نتفلكس'));

    expect(offenders(container)).toEqual([]);
  });

  it('every button in the bill modal has a spoken name, including delete', async () => {
    const { container } = renderScreen();
    await waitFor(() => expect(clean(container.textContent)).toContain('كهرباء'));

    // Open the modal in EDIT mode so the delete control is mounted.
    const editBtn = allButtons(container).find((b) => {
      const card = b.closest('.fin-card');
      return (
        accessibleName(b).includes('تعديل') &&
        !!card &&
        clean(card.textContent).includes('إنترنت')
      );
    });
    expect(editBtn).toBeTruthy();
    fireEvent.click(editBtn as Element);

    await waitFor(() => {
      expect(container.querySelector('input[placeholder="اسم الفاتورة"]')).toBeTruthy();
    });
    expect(offenders(container)).toEqual([]);

    // Arm the confirmation, which swaps in two more icon-only controls.
    const del = allButtons(container).find((b) => accessibleName(b).includes('حذف'));
    expect(del).toBeTruthy();
    fireEvent.click(del as Element);
    await waitFor(() => {
      expect(
        allButtons(container).some((b) => clean(b.textContent).includes('تأكيد'))
      ).toBe(true);
    });
    expect(offenders(container)).toEqual([]);
  });

  it('marks the decorative icon spans as hidden from assistive tech', () => {
    // A source-level check: without aria-hidden the ligature is concatenated
    // onto the accessible name, so the user hears "edit bill edit".
    const files = [
      'src/features/bills/components/Bills.tsx',
      'src/features/bills/components/BillModal.tsx',
      'src/features/bills/components/SubModal.tsx',
    ];
    for (const f of files) {
      const src = readFileSync(join(process.cwd(), f), 'utf8');
      // Every icon span sitting inside a labelled button must be hidden.
      const spans = src.match(/<span className="material-symbols-outlined[^>]*>/g) || [];
      const hidden = spans.filter((s) => s.includes('aria-hidden'));
      expect(
        hidden.length,
        `${f}: ${spans.length - hidden.length} icon span(s) still exposed to screen readers`
      ).toBe(spans.length);
    }
  });
});
