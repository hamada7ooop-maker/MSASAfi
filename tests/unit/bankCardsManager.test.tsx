import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BankCardsManager } from '@/features/cards/components/BankCardsManager';
import { db as DB } from '@/core/db/core';
import type { BankCard } from '@/types';

/**
 * Characterization tests for the bank cards screen (1,085 lines, no
 * render-level coverage before this).
 *
 * Written BEFORE any extraction. Their job is to pin the current behaviour so
 * that an extraction which silently drops a prop is caught, which only works
 * if they assert on things a user actually reads — the holder name on the
 * active card, the masked digits, which card the deck considers active.
 *
 * Card data is seeded with distinct values (last-4 of 4321 / 8765 / 2468, and
 * three different holders and banks) so no assertion can pass by matching a
 * default, a zero, or another card on the same screen.
 */

const clean = (s: string | null | undefined) => (s || '').replace(/\s+/g, ' ').trim();

const screenText = (c: HTMLElement) => clean(c.textContent);

const renderScreen = () =>
  render(
    <MemoryRouter>
      <BankCardsManager />
    </MemoryRouter>
  );

const makeCard = (over: Partial<BankCard> & { id: string }): BankCard => ({
  number: '4111111111114321',
  numberMasked: '•••• •••• •••• 4321',
  holder: 'AHMED AL SAUD',
  expiry: '11/29',
  bankId: 'alrajhi',
  bankName: 'مصرف الراجحي',
  countryId: 'sa',
  countryName: 'السعودية',
  countryFlag: '🇸🇦',
  style: { bgType: 'gradient', gradientName: 'sapphire' },
  ...over,
});

const CARDS: BankCard[] = [
  makeCard({ id: 'card_a' }),
  makeCard({
    id: 'card_b',
    number: '5222222222228765',
    numberMasked: '•••• •••• •••• 8765',
    holder: 'SARA ALMUTAIRI',
    expiry: '03/27',
    bankId: 'alahli',
    bankName: 'البنك الأهلي',
    style: { bgType: 'gradient', gradientName: 'emerald' },
  }),
  makeCard({
    id: 'card_c',
    number: '4333333333332468',
    numberMasked: '•••• •••• •••• 2468',
    holder: 'KHALID ALHARBI',
    expiry: '07/31',
    bankId: 'riyad',
    bankName: 'بنك الرياض',
    style: { bgType: 'gradient', gradientName: 'gold' },
  }),
];

async function wipe() {
  await DB.transaction('rw', DB.tables, async () => {
    for (const t of DB.tables) await t.clear();
  });
  await new Promise((r) => setTimeout(r, 0));
}

async function seedCards(cards: BankCard[] = CARDS) {
  await wipe();
  await DB.cards.bulkPut(cards as never);
}

/**
 * The clickable peek strip for a given bank.
 *
 * Picks the SMALLEST element containing both the bank name and the last four
 * digits: matching on any ancestor would return an outer wrapper whose click
 * handler is not the one that switches cards, and the test would silently
 * assert nothing.
 */
const peekStripFor = (c: HTMLElement, bank: string, last4: string): Element => {
  const matches = Array.from(c.querySelectorAll('div')).filter((d) => {
    const t = clean(d.textContent);
    return t.includes(bank) && t.includes(last4);
  });
  if (!matches.length) throw new Error(`No peek strip for ${bank}/${last4}`);
  return matches[matches.length - 1];
};

/**
 * The active-card detail panel, scoped.
 *
 * Asserting a holder name against the WHOLE screen is useless here: the peek
 * strips and the deck already carry every card's bank and digits, so a panel
 * pinned to the wrong card still "contains" the expected text. (Measured: a
 * mutant that made the panel always render cards[0] passed every test until
 * this helper existed.) Scoped by the cardHolder label the panel owns.
 */
const detailPanel = (c: HTMLElement): HTMLElement => {
  // The panel is the SMALLEST element that holds every detail row -- i.e. it
  // carries the holder label AND the expiry label. Taking the innermost match
  // on the holder label alone lands on a single cell; taking the outermost
  // lands on the whole screen. Both would make the scoping pointless.
  const candidates = Array.from(c.querySelectorAll('div')).filter((d) => {
    const t = clean(d.textContent);
    return t.includes('اسم صاحب البطاقة') && t.includes('الصلاحية') && t.includes('رقم البطاقة');
  });
  if (!candidates.length) throw new Error('detail panel not rendered');
  return candidates[candidates.length - 1] as HTMLElement;
};

/** The deck's "card N of M" counter, which encodes which card is active. */
const positionText = (c: HTMLElement) => {
  const m = screenText(c).match(/(\d+)\s*من\s*(\d+)/);
  return m ? { index: Number(m[1]), total: Number(m[2]) } : null;
};

describe('BankCardsManager — characterization', () => {
  beforeEach(() => seedCards());

  describe('Rendering the deck', () => {
    it('shows the first card as active, with its holder and masked number', async () => {
      const { container } = renderScreen();
      await waitFor(() => {
        expect(screenText(container)).toContain('AHMED AL SAUD');
      });
      // Scoped: the panel must describe card A specifically.
      const panel = clean(detailPanel(container).textContent);
      expect(panel).toContain('AHMED AL SAUD');
      expect(panel).toContain('4321');
      expect(panel).toContain('11/29');
      expect(panel).not.toContain('SARA ALMUTAIRI');
    });

    it('lists the other cards as peek strips below the active one', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('AHMED AL SAUD'));
      const text = screenText(container);
      // Every bank appears somewhere: one active, two peeking.
      expect(text).toContain('مصرف الراجحي');
      expect(text).toContain('البنك الأهلي');
      expect(text).toContain('بنك الرياض');
    });

    it('reports the deck position as card 1 of 3', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('AHMED AL SAUD'));
      expect(positionText(container)).toEqual({ index: 1, total: 3 });
    });

    it('renders the empty state when there are no cards', async () => {
      await wipe();
      const { container } = renderScreen();
      await waitFor(() => {
        expect(screenText(container)).toContain('لا توجد بطاقات مضافة حالياً');
      });
      // No stale card data from the seeded runs.
      expect(screenText(container)).not.toContain('AHMED AL SAUD');
    });
  });

  describe('Switching the active card', () => {
    it('promotes a peeked card to active when it is clicked', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('AHMED AL SAUD'));
      expect(positionText(container)).toEqual({ index: 1, total: 3 });

      // Click the peek strip belonging to the third card.
      const peek = peekStripFor(container, 'بنك الرياض', '2468');
      fireEvent.click(peek);

      // Position follows the newly active card — this is the observable proof
      // that selection actually changed, not merely that the name is on screen.
      await waitFor(() => {
        expect(positionText(container)).toEqual({ index: 3, total: 3 });
      });
      const panel = clean(detailPanel(container).textContent);
      expect(panel).toContain('KHALID ALHARBI');
      expect(panel).not.toContain('AHMED AL SAUD');
    });

    it('keeps the detail panel in step with the selected card', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('AHMED AL SAUD'));

      fireEvent.click(peekStripFor(container, 'البنك الأهلي', '8765'));

      await waitFor(() => {
        expect(positionText(container)).toEqual({ index: 2, total: 3 });
      });
      // Scoped to the panel, and asserted NOT to show the previously active
      // card -- both halves matter, since the deck still lists every card.
      const panel = clean(detailPanel(container).textContent);
      expect(panel).toContain('SARA ALMUTAIRI');
      expect(panel).toContain('03/27');
      expect(panel).not.toContain('AHMED AL SAUD');
      expect(panel).not.toContain('11/29');
    });
  });

  describe('Revealing card numbers', () => {
    it('masks the full number until reveal is pressed, then shows it', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('AHMED AL SAUD'));

      // Masked to begin with: the full PAN must not be on screen.
      expect(screenText(container)).not.toContain('4111 1111 1111 4321');

      const revealBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        clean(b.textContent).includes('إظهار')
      );
      expect(revealBtn).toBeTruthy();
      fireEvent.click(revealBtn as Element);

      await waitFor(() => {
        expect(clean(detailPanel(container).textContent)).toContain('4111 1111 1111 4321');
      });
      // ...and the masked form is no longer what the panel shows.
      expect(clean(detailPanel(container).textContent)).not.toContain('•••• •••• •••• 4321');
    });
  });

  describe('Add / edit modal', () => {
    it('opens the add-card modal from the header', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('AHMED AL SAUD'));

      // Icon-only button: identified by its title, not its text.
      const addBtn = container.querySelector('button[title="إضافة بطاقة جديدة"]');
      expect(addBtn).toBeTruthy();
      fireEvent.click(addBtn as Element);

      await waitFor(() => {
        // A blank card-number field, i.e. the add form rather than an edit.
        const inputs = Array.from(container.querySelectorAll('input')) as HTMLInputElement[];
        expect(inputs.length).toBeGreaterThan(0);
        expect(screenText(container)).toContain('رقم البطاقة');
      });
    });

    it('prefills the modal with the selected card when editing', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('AHMED AL SAUD'));

      const editBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        clean(b.textContent).includes('تعديل')
      );
      expect(editBtn).toBeTruthy();
      fireEvent.click(editBtn as Element);

      // Prefilled from the ACTIVE card. Every field is checked, not just the
      // holder: an edit form that opens blank, or carries another card's
      // number, is the failure mode an extraction introduces here.
      await waitFor(() => {
        const values = (
          Array.from(container.querySelectorAll('input')) as HTMLInputElement[]
        ).map((i) => i.value);
        expect(values).toContain('AHMED AL SAUD');
        expect(values).toContain('11/29');
        expect(values.some((v) => v.replace(/\s/g, '') === '4111111111114321')).toBe(true);
      });
    });

    it('prefills the modal with the newly selected card after switching', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('AHMED AL SAUD'));

      fireEvent.click(peekStripFor(container, 'بنك الرياض', '2468'));
      await waitFor(() => {
        expect(positionText(container)).toEqual({ index: 3, total: 3 });
      });

      const editBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        clean(b.textContent).includes('تعديل')
      );
      fireEvent.click(editBtn as Element);

      // The edit button must carry the ACTIVE card through, not a captured
      // first card -- which is precisely what breaks when the deck and the
      // modal end up in different components.
      await waitFor(() => {
        const values = (
          Array.from(container.querySelectorAll('input')) as HTMLInputElement[]
        ).map((i) => i.value);
        expect(values).toContain('KHALID ALHARBI');
        expect(values).not.toContain('AHMED AL SAUD');
      });
    });
  });

  /**
   * Callbacks crossing the new parent/modal boundary.
   *
   * Mutation testing showed the tests above were blind to all three: making
   * `onClose` a no-op, dropping the deck reload after a save, or failing to
   * select a newly added card all left every assertion green. A modal that
   * renders correctly but cannot be dismissed -- or a save that does not show
   * up in the deck -- is exactly what an extraction breaks.
   */
  describe('Modal callbacks across the boundary', () => {
    it('closes the sheet when cancel is pressed', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('AHMED AL SAUD'));

      fireEvent.click(container.querySelector('button[title="إضافة بطاقة جديدة"]') as Element);
      await waitFor(() => expect(screenText(container)).toContain('رقم البطاقة'));

      const cancel = Array.from(container.querySelectorAll('button')).find(
        (b) => clean(b.textContent) === 'إلغاء'
      );
      expect(cancel).toBeTruthy();
      fireEvent.click(cancel as Element);

      await waitFor(() => {
        expect(
          Array.from(container.querySelectorAll('button')).some(
            (b) => clean(b.textContent) === 'حفظ البطاقة'
          )
        ).toBe(false);
      });
    });

    it('adds a new card, selects it, and shows it in the deck', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('AHMED AL SAUD'));
      expect(positionText(container)).toEqual({ index: 1, total: 3 });

      fireEvent.click(container.querySelector('button[title="إضافة بطاقة جديدة"]') as Element);
      await waitFor(() => expect(screenText(container)).toContain('رقم البطاقة'));

      const inputs = Array.from(container.querySelectorAll('input')) as HTMLInputElement[];
      const byPlaceholder = (frag: string) =>
        inputs.find((i) => (i.placeholder || '').includes(frag));

      fireEvent.change(byPlaceholder('0000 0000') as HTMLInputElement, {
        target: { value: '4555 5555 5555 9911' },
      });
      fireEvent.change(byPlaceholder('MOHAMMED') as HTMLInputElement, {
        target: { value: 'NEW HOLDER' },
      });
      fireEvent.change(byPlaceholder('MM/YY') as HTMLInputElement, {
        target: { value: '09/30' },
      });
      fireEvent.change(byPlaceholder('•••') as HTMLInputElement, {
        target: { value: '123' },
      });

      const saveBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => clean(b.textContent) === 'حفظ البطاقة'
      );
      expect(saveBtn).toBeTruthy();
      fireEvent.click(saveBtn as Element);

      // It must land in the database...
      await waitFor(async () => {
        expect(await DB.cards.count()).toBe(4);
      });

      // ...and the deck must reload AND select it: 4 cards, and the newly
      // added one is active. Asserting only the count would miss a dropped
      // setActiveCardId; asserting only the name would miss a missing reload.
      await waitFor(() => {
        expect(positionText(container)).toEqual({ index: 4, total: 4 });
      });
      expect(clean(detailPanel(container).textContent)).toContain('NEW HOLDER');
    });

    it('updates an edited card in place without changing the selection', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('AHMED AL SAUD'));

      // Select the SECOND card, then edit it. Staying on card 2 afterwards is
      // the property under test: an edit must not hijack the selection the way
      // adding a card deliberately does.
      fireEvent.click(peekStripFor(container, 'البنك الأهلي', '8765'));
      await waitFor(() => expect(positionText(container)).toEqual({ index: 2, total: 3 }));

      const editBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        clean(b.textContent).includes('تعديل')
      );
      fireEvent.click(editBtn as Element);
      await waitFor(() => {
        const values = (
          Array.from(container.querySelectorAll('input')) as HTMLInputElement[]
        ).map((i) => i.value);
        expect(values).toContain('SARA ALMUTAIRI');
      });

      const holder = (Array.from(container.querySelectorAll('input')) as HTMLInputElement[]).find(
        (i) => (i.placeholder || '').includes('MOHAMMED')
      );
      fireEvent.change(holder as HTMLInputElement, { target: { value: 'SARA UPDATED' } });

      const updateBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => clean(b.textContent) === 'تحديث البطاقة'
      );
      expect(updateBtn).toBeTruthy();
      fireEvent.click(updateBtn as Element);

      // The deck reloads and shows the new name...
      await waitFor(() => {
        expect(clean(detailPanel(container).textContent)).toContain('SARA UPDATED');
      });
      // ...no card was added, and the user is still on card 2.
      expect(await DB.cards.count()).toBe(3);
      expect(positionText(container)).toEqual({ index: 2, total: 3 });
    });
  });
});
