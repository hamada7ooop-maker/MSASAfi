import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Bills } from '@/features/bills/components/Bills';
import { db as DB } from '@/core/db/core';
import type { Bill, Subscription } from '@/types';

/**
 * Characterization tests for the bills screen (699 lines).
 *
 * Written BEFORE any extraction. The substance here is the split between
 * overdue and upcoming bills and the total still owed, so those are what the
 * assertions target -- a refactor that renders the cards but miscounts the
 * buckets, or totals paid bills into the amount due, is the realistic failure.
 *
 * Amounts are distinct powers-of-ten-ish values (1,250 / 430 / 890 / 75) so no
 * total can coincide with another figure on the page, and a dropped or
 * double-counted bill changes the sum uniquely.
 */

const clean = (s: string | null | undefined) => (s || '').replace(/\s+/g, ' ').trim();
const screenText = (c: HTMLElement) => clean(c.textContent);
const digitsOf = (s: string) => s.replace(/[^\d]/g, '');

const LABEL = {
  totalDue: 'إجمالي المستحق',
  overdue: 'مستحقة!',
  upcoming: 'فواتير قادمة',
  bills: 'الفواتير',
  subs: 'الاشتراكات الدورية',
  noBills: 'لا فواتير',
  addBill: 'إضافة فاتورة',
  namePlaceholder: 'اسم الفاتورة',
  amount: 'المبلغ',
  save: 'حفظ',
  pay: 'دفع',
} as const;

const iso = (daysFromNow: number) =>
  new Date(Date.now() + daysFromNow * 86400000).toISOString().slice(0, 10);

/** Overdue: 1,250 + 430. Upcoming: 890. Paid: 9,999 (must not be counted). */
const BILLS: Bill[] = [
  { id: 'b_over1', name: 'كهرباء', amount: 1250, dueDate: iso(-10), recurring: 'monthly', icon: 'bolt' },
  { id: 'b_over2', name: 'ماء', amount: 430, dueDate: iso(-3), recurring: 'monthly', icon: 'water_drop' },
  { id: 'b_soon', name: 'إنترنت', amount: 890, dueDate: iso(5), recurring: 'monthly', icon: 'wifi' },
  { id: 'b_paid', name: 'إيجار', amount: 9999, dueDate: iso(-20), recurring: 'monthly', icon: 'home', isPaid: true, paidDate: iso(-19) },
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
 * The summary strip that carries the total due.
 *
 * Scoped rather than matched against the whole page: every bill card also
 * prints an amount, so a page-wide search for "1680" would pass even if the
 * header showed something else entirely.
 */
const summaryStrip = (c: HTMLElement): string => {
  const blocks = Array.from(c.querySelectorAll('div')).filter((d) =>
    clean(d.textContent).includes(LABEL.totalDue)
  );
  if (!blocks.length) throw new Error('summary strip not rendered');
  return clean(blocks[blocks.length - 1].textContent);
};

/**
 * The header's add button.
 *
 * Icon-only (a material "add" ligature, no title attribute), so it cannot be
 * matched by a human-readable label. Identified by its ligature text, which is
 * the only stable handle the markup offers.
 */
const addButton = (c: HTMLElement): Element => {
  const btn = Array.from(c.querySelectorAll('button')).find(
    (b) => clean(b.textContent) === 'add'
  );
  if (!btn) throw new Error('add button not found');
  return btn;
};

/** The "pay" button belonging to a named bill's card. */
const payButtonFor = (c: HTMLElement, name: string): Element => {
  const btn = Array.from(c.querySelectorAll('button')).find((b) => {
    if (!clean(b.textContent).includes(LABEL.pay)) return false;
    // Walk up until an ancestor carries the bill name, so the button is
    // matched to its OWN card rather than to whichever pay button comes first.
    const card = b.closest('.fin-card');
    return !!card && clean(card.textContent).includes(name);
  });
  if (!btn) throw new Error(`No pay button for ${name}`);
  return btn;
};

/** The icon-only edit button on a named bill's card. */
const editButtonFor = (c: HTMLElement, name: string): Element => {
  const btn = Array.from(c.querySelectorAll('button')).find((b) => {
    if (clean(b.textContent) !== 'edit') return false;
    const card = b.closest('.fin-card');
    return !!card && clean(card.textContent).includes(name);
  });
  if (!btn) throw new Error(`No edit button for ${name}`);
  return btn;
};

/** The bill-name field inside an open modal. */
const modalNameField = (c: HTMLElement): HTMLInputElement => {
  const f = c.querySelector(
    `input[placeholder="${LABEL.namePlaceholder}"]`
  ) as HTMLInputElement | null;
  if (!f) throw new Error('modal name field not rendered');
  return f;
};

/** The counter tile sitting under a summary label (overdue / upcoming). */
const counterFor = (c: HTMLElement, label: string): string => {
  // Scoped to the summary header. The word "مستحقة!" also appears on every
  // overdue bill CARD, so an unscoped search returns a card and reads its
  // amount as if it were a count.
  const header = Array.from(c.querySelectorAll('div')).filter((d) =>
    clean(d.textContent).includes(LABEL.totalDue)
  );
  if (!header.length) throw new Error('summary header not rendered');
  const scope = header[header.length - 1];

  const tiles = Array.from(scope.querySelectorAll('div')).filter((d) => {
    const txt = clean(d.textContent);
    return txt.includes(label) && /\d/.test(txt);
  });
  if (!tiles.length) throw new Error(`No counter tile for ${label}`);
  return clean(tiles[tiles.length - 1].textContent).replace(label, '');
};

/** The card for a named bill. */
const cardFor = (c: HTMLElement, name: string): string => {
  // Selected by the card root class rather than by nesting depth: matching on
  // the name alone lands on the title node (text = just the name), and adding
  // "contains a digit" lands on the days-left line.
  const cards = Array.from(c.querySelectorAll('.fin-card')).filter((d) =>
    clean(d.textContent).includes(name)
  );
  if (!cards.length) throw new Error(`No card for ${name}`);
  return clean(cards[cards.length - 1].textContent);
};

const tabButton = (c: HTMLElement, label: string) =>
  Array.from(c.querySelectorAll('button')).find((b) =>
    clean(b.textContent).startsWith(label)
  );

async function seed(bills: Bill[] = BILLS, subs: Subscription[] = SUBS) {
  await DB.transaction('rw', DB.tables, async () => {
    for (const t of DB.tables) await t.clear();
  });
  if (bills.length) await DB.bills.bulkPut(bills as never);
  if (subs.length) await DB.subscriptions.bulkPut(subs as never);
  await new Promise((r) => setTimeout(r, 0));
}

describe('Bills — characterization', () => {
  beforeEach(() => seed());

  describe('Summary and bucketing', () => {
    it('totals only the unpaid bills', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('كهرباء'));

      // 1,250 + 430 + 890 = 2,570. The paid 9,999 must not be included.
      await waitFor(() => {
        expect(digitsOf(summaryStrip(container))).toContain('2570');
      });
      expect(digitsOf(summaryStrip(container))).not.toContain('9999');
    });

    it('separates overdue from upcoming', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('كهرباء'));

      // Each counter is read from its OWN tile. Asserting that "2" and "1"
      // both appear somewhere in the strip is useless: swapping the two lists
      // leaves both digits present, and that mutant survived until this
      // assertion existed.
      expect(digitsOf(counterFor(container, LABEL.overdue))).toBe('2');
      expect(digitsOf(counterFor(container, LABEL.upcoming))).toBe('1');
    });

    it('lists every unpaid bill by name', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('كهرباء'));

      const text = screenText(container);
      expect(text).toContain('ماء');
      expect(text).toContain('إنترنت');
    });

    it('shows each bill its own amount', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('كهرباء'));

      // Pinned per card: swapping two amounts leaves both on the page.
      expect(digitsOf(cardFor(container, 'كهرباء'))).toContain('1250');
      expect(digitsOf(cardFor(container, 'إنترنت'))).toContain('890');
      expect(digitsOf(cardFor(container, 'كهرباء'))).not.toContain('890');
    });

    it('renders an empty state with no bills', async () => {
      await seed([], []);
      const { container } = renderScreen();
      await waitFor(() => {
        expect(screenText(container)).toContain(LABEL.noBills);
      });
      expect(screenText(container)).not.toContain('كهرباء');
    });
  });

  describe('Tabs', () => {
    it('switches to subscriptions and back', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('كهرباء'));

      fireEvent.click(tabButton(container, LABEL.subs) as Element);
      await waitFor(() => {
        expect(screenText(container)).toContain('نتفلكس');
      });
      // Bills belong to the other tab.
      expect(screenText(container)).not.toContain('كهرباء');

      fireEvent.click(tabButton(container, LABEL.bills) as Element);
      await waitFor(() => {
        expect(screenText(container)).toContain('كهرباء');
      });
      expect(screenText(container)).not.toContain('نتفلكس');
    });
  });

  describe('Paying a bill', () => {
    it('removes a bill from the due total once it is paid', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(digitsOf(summaryStrip(container))).toContain('2570'));

      // Pay the 430 water bill: 2,570 - 430 = 2,140.
      fireEvent.click(payButtonFor(container, 'ماء'));

      await waitFor(async () => {
        const row = (await DB.bills.get('b_over2')) as Bill | undefined;
        expect(row?.isPaid).toBe(true);
      });
      await waitFor(() => {
        expect(digitsOf(summaryStrip(container))).toContain('2140');
      });
    });
  });

  describe('Add / edit modal', () => {
    it('opens a blank add-bill form', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('كهرباء'));

      fireEvent.click(addButton(container));

      await waitFor(() => {
        const nameField = container.querySelector(
          `input[placeholder="${LABEL.namePlaceholder}"]`
        ) as HTMLInputElement | null;
        expect(nameField).toBeTruthy();
        expect(nameField?.value).toBe('');
      });
    });

    it('prefills the modal with the bill being edited', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('كهرباء'));

      fireEvent.click(editButtonFor(container, 'إنترنت'));

      // Prefilled from the clicked bill -- a dropped `bill` prop opens a blank
      // form, and the user would silently create a duplicate instead of
      // editing.
      await waitFor(() => {
        expect(modalNameField(container).value).toBe('إنترنت');
      });
      const amountField = Array.from(container.querySelectorAll('input')).find(
        (i) => i.getAttribute('inputmode') === 'decimal'
      ) as HTMLInputElement;
      expect(amountField.value).toBe('890');
    });

    it('UPDATES the edited bill rather than adding a second one', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(digitsOf(summaryStrip(container))).toContain('2570'));

      fireEvent.click(editButtonFor(container, 'إنترنت'));
      await waitFor(() => expect(modalNameField(container).value).toBe('إنترنت'));

      const amountField = Array.from(container.querySelectorAll('input')).find(
        (i) => i.getAttribute('inputmode') === 'decimal'
      ) as HTMLInputElement;
      fireEvent.change(amountField, { target: { value: '1000' } });
      fireEvent.click(
        Array.from(container.querySelectorAll('button')).find(
          (b) => clean(b.textContent) === LABEL.save
        ) as Element
      );

      // NOTE on coverage: routing this through `addBill` instead of
      // `updateBill` is an EQUIVALENT mutation, verified by reading
      // schema.ts -- `addBill` does `put({ ...data, id: data.id || generated })`
      // and the modal spreads `...bill`, which carries the id. Both paths
      // therefore upsert the same row. The assertions below still pin the
      // outcome the user cares about; they simply cannot distinguish the two
      // code paths, and no test could.
      //
      // Still four bills -- an add-instead-of-update would make five if the
      // id were ever dropped...
      await waitFor(async () => {
        const row = (await DB.bills.get('b_soon')) as Bill | undefined;
        expect(row?.amount).toBe(1000);
      });
      expect(await DB.bills.count()).toBe(4);
      // ...and the total moves by the difference: 2,570 - 890 + 1,000 = 2,680.
      await waitFor(() => {
        expect(digitsOf(summaryStrip(container))).toContain('2680');
      });
    });

    it('closes the modal after saving', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('كهرباء'));

      fireEvent.click(addButton(container));
      await waitFor(() => expect(modalNameField(container).value).toBe(''));

      fireEvent.change(modalNameField(container), { target: { value: 'غاز' } });
      // An amount is required: handleSave returns early on a zero amount, so
      // omitting it would test the validation path, not the close path.
      const amt = Array.from(container.querySelectorAll('input')).find(
        (i) => i.getAttribute('inputmode') === 'decimal'
      ) as HTMLInputElement;
      fireEvent.change(amt, { target: { value: '360' } });

      fireEvent.click(
        Array.from(container.querySelectorAll('button')).find(
          (b) => clean(b.textContent) === LABEL.save
        ) as Element
      );

      // A modal that saves but never closes traps the user behind it.
      await waitFor(() => {
        expect(
          container.querySelector(`input[placeholder="${LABEL.namePlaceholder}"]`)
        ).toBeNull();
      });
    });

    it('deletes a bill from inside the edit modal', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('كهرباء'));

      fireEvent.click(editButtonFor(container, 'إنترنت'));
      await waitFor(() => expect(modalNameField(container).value).toBe('إنترنت'));

      // Two-step: the delete button arms a confirmation before acting. It is
      // icon-only, so it reads as the "delete" ligature rather than as حذف.
      const delBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => clean(b.textContent) === 'delete'
      );
      expect(delBtn).toBeTruthy();
      fireEvent.click(delBtn as Element);

      const confirmBtn = await waitFor(() => {
        const b = Array.from(container.querySelectorAll('button')).find((x) =>
          clean(x.textContent).includes('تأكيد')
        );
        if (!b) {
          const seen = Array.from(container.querySelectorAll('button'))
            .map((x) => clean(x.textContent))
            .join(' | ');
          throw new Error(`confirm button not found; saw: ${seen}`);
        }
        return b;
      });
      fireEvent.click(confirmBtn);

      await waitFor(async () => {
        expect(await DB.bills.get('b_soon')).toBeUndefined();
      });
    });

    it('opens a blank form for a NEW bill even after editing one', async () => {
      // Order matters: adding on a fresh page cannot see a stale `editingBill`.
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('كهرباء'));

      fireEvent.click(editButtonFor(container, 'إنترنت'));
      await waitFor(() => expect(modalNameField(container).value).toBe('إنترنت'));

      // Dismiss, then add.
      const cancel = Array.from(container.querySelectorAll('button')).find(
        (b) => clean(b.textContent) === 'إلغاء' || clean(b.textContent) === 'close'
      );
      if (cancel) fireEvent.click(cancel);
      await waitFor(() => {
        expect(
          container.querySelector(`input[placeholder="${LABEL.namePlaceholder}"]`)
        ).toBeNull();
      });

      fireEvent.click(addButton(container));
      await waitFor(() => {
        expect(modalNameField(container).value).toBe('');
      });
    });

    it('prefills the subscription modal with the sub being edited', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('كهرباء'));

      fireEvent.click(tabButton(container, LABEL.subs) as Element);
      await waitFor(() => expect(screenText(container)).toContain('نتفلكس'));

      const editBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => clean(b.textContent) === 'edit'
      );
      expect(editBtn).toBeTruthy();
      fireEvent.click(editBtn as Element);

      // The subscription modal is wired separately from the bill modal, so it
      // needs its own assertion: dropping `sub` opens a blank form and the
      // user silently creates a duplicate subscription.
      await waitFor(() => {
        const values = (
          Array.from(container.querySelectorAll('input')) as HTMLInputElement[]
        ).map((i) => i.value);
        expect(values).toContain('نتفلكس');
        expect(values).toContain('75');
      });
    });

    it('saves a new bill and adds it to the total', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(digitsOf(summaryStrip(container))).toContain('2570'));

      fireEvent.click(addButton(container));

      const nameField = await waitFor(() => {
        const f = container.querySelector(
          `input[placeholder="${LABEL.namePlaceholder}"]`
        ) as HTMLInputElement | null;
        if (!f) throw new Error('name field missing');
        return f;
      });
      fireEvent.change(nameField, { target: { value: 'غاز' } });

      const amountField = Array.from(
        container.querySelectorAll('input')
      ).find((i) => i.getAttribute('inputmode') === 'decimal') as HTMLInputElement;
      expect(amountField).toBeTruthy();
      fireEvent.change(amountField, { target: { value: '360' } });

      const saveBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => clean(b.textContent) === LABEL.save
      );
      expect(saveBtn).toBeTruthy();
      fireEvent.click(saveBtn as Element);

      // Persisted...
      await waitFor(async () => {
        expect(await DB.bills.count()).toBe(5);
      });
      // ...and folded into the total: 2,570 + 360 = 2,930.
      await waitFor(() => {
        expect(digitsOf(summaryStrip(container))).toContain('2930');
      });
    });
  });
});
