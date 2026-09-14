import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TravelBudget } from '@/features/budgets/components/TravelBudget';
import { db as DB } from '@/core/db/core';
import type { Trip } from '@/types';

/**
 * Characterization tests for the travel budget screen (923 lines).
 *
 * Written BEFORE any extraction. The substance of this screen is a currency
 * conversion: a trip's budget is held in a foreign currency, spending is
 * recorded in the base currency, and the card has to reconcile the two. Those
 * converted figures are what these tests assert, because a refactor that
 * renders the right labels against the wrong side of the exchange rate is the
 * realistic failure here.
 *
 * Values are picked so every intermediate is distinguishable: rate 4.0 turns a
 * 2,000 EUR budget into 8,000 SAR, and 3,000 SAR of spending back into 750 EUR.
 * No two of those numbers collide.
 */

const clean = (s: string | null | undefined) => (s || '').replace(/\s+/g, ' ').trim();
const screenText = (c: HTMLElement) => clean(c.textContent);
const digitsOf = (s: string) => s.replace(/[^\d]/g, '');

const LABEL = {
  title: 'ميزانية السفر',
  spent: 'المصروف',
  budget: 'الميزانية',
  createTrip: 'إضافة رحلة جديدة',
  editTrip: 'تعديل الرحلة',
  tripName: 'اسم الرحلة / الوجهة',
  budgetLimit: 'الميزانية بالعملة الأجنبية',
  rate: 'سعر الصرف لـ ر.س',
  noTrips: 'لا توجد رحلات سفر',
} as const;

const renderScreen = () =>
  render(
    <MemoryRouter>
      <TravelBudget />
    </MemoryRouter>
  );

const TRIP: Trip = {
  id: 'trip_paris',
  name: 'باريس',
  currency: 'EUR',
  limit: 2000,
  exchangeRate: 4,
  startDate: '2026-03-01',
  endDate: '2026-03-10',
  isActive: true,
  description: 'رحلة الربيع',
};

const TRIP_B: Trip = {
  id: 'trip_tokyo',
  name: 'طوكيو',
  currency: 'JPY',
  limit: 500,
  exchangeRate: 25,
  startDate: '2026-06-01',
  endDate: '2026-06-12',
  isActive: false,
  description: 'رحلة الصيف',
};

/**
 * The card belonging to a trip, scoped by its name.
 *
 * Whole-page assertions are useless once two trips are on screen: both cards
 * carry a "spent" and a "budget" figure, so a card wired to the wrong trip
 * still puts every expected number somewhere in the document.
 */
const cardFor = (c: HTMLElement, tripName: string): string => {
  const cards = Array.from(c.querySelectorAll('div')).filter((d) => {
    const txt = clean(d.textContent);
    return txt.includes(tripName) && txt.includes(LABEL.spent);
  });
  if (!cards.length) throw new Error(`No card for ${tripName}`);
  return clean(cards[cards.length - 1].textContent);
};

/** A form field in the add/edit modal, found by its visible label. */
const fieldFor = (c: HTMLElement, label: string): HTMLElement => {
  const rows = Array.from(c.querySelectorAll('div')).filter(
    (d) =>
      clean(d.textContent).includes(label) &&
      (d.querySelector('input') || d.querySelector('textarea') || d.querySelector('select'))
  );
  if (!rows.length) throw new Error(`No field for ${label}`);
  const row = rows[rows.length - 1];
  return (row.querySelector('input') ||
    row.querySelector('textarea') ||
    row.querySelector('select')) as HTMLElement;
};

const openAddModal = (c: HTMLElement) => {
  // Icon-only button ("add" ligature); identified by its title.
  const btn = c.querySelector('button[title="إضافة"]');
  if (!btn) throw new Error('add-trip button not found');
  fireEvent.click(btn);
};

async function seed(trips: Trip[] = [TRIP]) {
  await DB.transaction('rw', DB.tables, async () => {
    for (const t of DB.tables) await t.clear();
  });
  if (trips.length) await DB.trips.bulkPut(trips as never);
  // 1,800 + 1,200 = 3,000 SAR spent on the Paris trip.
  await DB.transactions.bulkPut([
    { id: 'tx1', type: 'expense', amount: 1800, description: 'فندق', tripId: 'trip_paris', date: '2026-03-02', createdAt: '2026-03-02T00:00:00.000Z' },
    { id: 'tx2', type: 'expense', amount: 1200, description: 'مطاعم', tripId: 'trip_paris', date: '2026-03-03', createdAt: '2026-03-03T00:00:00.000Z' },
    // Unlinked: must never be counted against a trip.
    { id: 'tx3', type: 'expense', amount: 9999, description: 'بقالة', date: '2026-03-04', createdAt: '2026-03-04T00:00:00.000Z' },
  ] as never);
  await new Promise((r) => setTimeout(r, 0));
}

describe('TravelBudget — characterization', () => {
  beforeEach(() => seed());

  describe('Trip cards and currency conversion', () => {
    it('converts the foreign budget into the base currency', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('باريس'));

      const card = cardFor(container, 'باريس');
      // Budget 2,000 EUR at rate 4 -> 8,000 SAR. Both sides must be shown.
      expect(digitsOf(card)).toContain('2000');
      expect(digitsOf(card)).toContain('8000');
    });

    it('converts spending back into the trip currency', async () => {
      const { container } = renderScreen();
      // Wait for the SPENDING to arrive, not just the name: loadData resolves
      // the trips and their grouped expenses in one async pass, so the card
      // renders with zeroes for a tick and an early assertion reads those.
      await waitFor(() => {
        expect(digitsOf(cardFor(container, 'باريس'))).toContain('3000');
      });

      const card = cardFor(container, 'باريس');
      // 3,000 SAR spent / rate 4 = 750 EUR.
      expect(digitsOf(card)).toContain('750');
    });

    it('shows the consumption percentage of the converted budget', async () => {
      const { container } = renderScreen();
      await waitFor(() => {
        expect(digitsOf(cardFor(container, 'باريس'))).toContain('3000');
      });

      // 3,000 spent against an 8,000 SAR budget = 37.5%. Asserted because a
      // hard-zeroed percentage renders a plausible-looking bar and passed every
      // other test in this file.
      expect(cardFor(container, 'باريس')).toContain('37.5');
    });

    it('excludes transactions that are not linked to the trip', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('باريس'));

      // The unlinked 9,999 expense must not reach any trip figure.
      expect(digitsOf(cardFor(container, 'باريس'))).not.toContain('9999');
    });

    it('keeps two trips independent of one another', async () => {
      await seed([TRIP, TRIP_B]);
      const { container } = renderScreen();
      await waitFor(() => {
        expect(digitsOf(cardFor(container, 'باريس'))).toContain('3000');
      });
      expect(screenText(container)).toContain('طوكيو');

      // Tokyo has no linked spending: its own card must show none, even though
      // the Paris card on the same screen shows 3,000.
      const tokyo = cardFor(container, 'طوكيو');
      expect(digitsOf(tokyo)).not.toContain('3000');
      expect(digitsOf(tokyo)).not.toContain('750');
      // Its budget still converts on its own rate: 500 JPY x 25 = 12,500.
      expect(digitsOf(tokyo)).toContain('12500');

      expect(digitsOf(cardFor(container, 'باريس'))).toContain('3000');
    });

    it('renders an empty state when there are no trips', async () => {
      await seed([]);
      const { container } = renderScreen();
      await waitFor(() => {
        expect(screenText(container)).toContain(LABEL.noTrips);
      });
      expect(screenText(container)).not.toContain('باريس');
    });
  });

  describe('Add / edit modal', () => {
    it('opens a blank form for a new trip', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('باريس'));

      openAddModal(container);

      await waitFor(() => {
        expect(screenText(container)).toContain(LABEL.createTrip);
      });
      // Blank, not carrying the existing trip's details.
      expect((fieldFor(container, LABEL.tripName) as HTMLInputElement).value).toBe('');
    });

    it('prefills the form when editing an existing trip', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('باريس'));

      // Expand the card, then use its edit action. The click handler sits on
      // the card ROOT (`.fin-card`), so clicking an inner div does nothing --
      // the expandable section never opens and the edit button never mounts.
      const card = container.querySelector('.fin-card');
      expect(card).toBeTruthy();
      fireEvent.click(card as Element);

      const editBtn = await waitFor(() => {
        const b = Array.from(container.querySelectorAll('button')).find((x) =>
          clean(x.textContent).includes('تعديل')
        );
        if (!b) throw new Error('edit button not found');
        return b;
      });
      fireEvent.click(editBtn);

      await waitFor(() => {
        expect(screenText(container)).toContain(LABEL.editTrip);
      });
      // Every field carries the trip's own values -- a broken wiring shows a
      // blank form or another trip's numbers.
      expect((fieldFor(container, LABEL.tripName) as HTMLInputElement).value).toBe('باريس');
      expect((fieldFor(container, LABEL.budgetLimit) as HTMLInputElement).value).toBe('2000');
      expect((fieldFor(container, LABEL.rate) as HTMLInputElement).value).toBe('4');
    });

    it('stays closed until the add button is pressed', async () => {
      // Pins `open`: hard-wiring it true renders the sheet over the grid on
      // every visit, which no other assertion noticed.
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('باريس'));

      expect(screenText(container)).not.toContain(LABEL.createTrip);
      expect(screenText(container)).not.toContain(LABEL.tripName);
    });

    it('closes the sheet when cancel is pressed', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('باريس'));

      openAddModal(container);
      await waitFor(() => expect(screenText(container)).toContain(LABEL.createTrip));

      const cancel = Array.from(container.querySelectorAll('button')).find(
        (b) => clean(b.textContent) === 'إلغاء'
      );
      expect(cancel).toBeTruthy();
      fireEvent.click(cancel as Element);

      // A modal that renders correctly but cannot be dismissed traps the user.
      await waitFor(() => {
        expect(screenText(container)).not.toContain(LABEL.createTrip);
      });
    });

    it('opens a BLANK form for a new trip even after editing one', async () => {
      // The order matters. Testing "add" on a fresh page cannot see a stale
      // `tripToEdit`, so a handleAddNew that forgets to clear it survives.
      // Editing first, then adding, is the sequence a user actually performs --
      // and the one where the bug would save changes onto the wrong trip.
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('باريس'));

      fireEvent.click(container.querySelector('.fin-card') as Element);
      const editBtn = await waitFor(() => {
        const b = Array.from(container.querySelectorAll('button')).find((x) =>
          clean(x.textContent).includes('تعديل')
        );
        if (!b) throw new Error('edit button not found');
        return b;
      });
      fireEvent.click(editBtn);
      await waitFor(() => expect(screenText(container)).toContain(LABEL.editTrip));

      const cancel = Array.from(container.querySelectorAll('button')).find(
        (b) => clean(b.textContent) === 'إلغاء'
      );
      fireEvent.click(cancel as Element);
      await waitFor(() => expect(screenText(container)).not.toContain(LABEL.editTrip));

      openAddModal(container);
      await waitFor(() => expect(screenText(container)).toContain(LABEL.createTrip));

      // Blank, and titled "create" rather than "edit".
      expect((fieldFor(container, LABEL.tripName) as HTMLInputElement).value).toBe('');
      expect(screenText(container)).not.toContain(LABEL.editTrip);
    });

    it('saves a new trip and shows it on the grid', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('باريس'));

      openAddModal(container);
      await waitFor(() => expect(screenText(container)).toContain(LABEL.createTrip));

      fireEvent.change(fieldFor(container, LABEL.tripName), { target: { value: 'مدريد' } });
      fireEvent.change(fieldFor(container, LABEL.budgetLimit), { target: { value: '1500' } });
      fireEvent.change(fieldFor(container, LABEL.rate), { target: { value: '4' } });

      const saveBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => clean(b.textContent) === 'حفظ'
      );
      expect(saveBtn).toBeTruthy();
      fireEvent.click(saveBtn as Element);

      // Persisted...
      await waitFor(async () => {
        expect(await DB.trips.count()).toBe(2);
      });
      // ...and on the grid, converted: 1,500 x 4 = 6,000.
      await waitFor(() => {
        expect(screenText(container)).toContain('مدريد');
      });
      expect(digitsOf(cardFor(container, 'مدريد'))).toContain('6000');
    });
  });
});
