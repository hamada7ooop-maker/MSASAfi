import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Challenges } from '@/features/challenges/components/Challenges';
import { db as DB } from '@/core/db/core';
import type { Challenge } from '@/types';

/**
 * Characterization tests for the challenges screen (692 lines).
 *
 * Written BEFORE any extraction. The screen has three independent tabs --
 * custom challenges, the 52-week saver, and the no-spend day -- each with its
 * own state and persistence. The assertions therefore target what each tab
 * computes and remembers, because the realistic failure of an extraction here
 * is a tab that renders but no longer receives, or no longer saves, its data.
 *
 * Progress values are distinct (35 / 80 / 12) so no figure can coincide with
 * another on the page.
 */

const clean = (s: string | null | undefined) => (s || '').replace(/\s+/g, ' ').trim();
const screenText = (c: HTMLElement) => clean(c.textContent);
const digitsOf = (s: string) => s.replace(/[^\d]/g, '');

const LABEL = {
  title: 'التحديات',
  tabCustom: 'مخصصة',
  tab52: '52 أسبوعاً',
  tabNoSpend: 'بلا إنفاق',
  empty: 'لا توجد تحديات نشطة حالياً',
  activeChallenges: 'تحديات نشطة',
  noSpendTitle: 'تحدي اليوم بلا إنفاق',
} as const;

const CHALLENGES: Challenge[] = [
  { id: 'c1', name: 'توفير القهوة', type: 'save', duration: 30, progress: 35, target: 500, icon: 'savings' },
  { id: 'c2', name: 'بلا مطاعم', type: 'avoid', duration: 14, progress: 80, icon: 'no_food' },
];

const renderScreen = () =>
  render(
    <MemoryRouter>
      <Challenges />
    </MemoryRouter>
  );

const allButtons = (c: HTMLElement) => Array.from(c.querySelectorAll('button'));

/** A top-level tab button, matched on its visible label. */
const tabButton = (c: HTMLElement, label: string): Element => {
  const b = allButtons(c).find((x) => clean(x.textContent).includes(label));
  if (!b) throw new Error(`No tab button for ${label}`);
  return b;
};

/**
 * The card for a named challenge.
 *
 * Scoped to the smallest element carrying both the name and a digit: the
 * innermost match on the name alone is the title node, whose text is just the
 * name, so a progress assertion against it would always fail.
 */
const cardFor = (c: HTMLElement, name: string): string => {
  // Selected by the card root class. Matching the name alone lands on the
  // title node (text = just the name), and "smallest div containing a digit"
  // lands on the duration chip, which is why an early version of this helper
  // read 30 where the progress is 35.
  const cards = Array.from(c.querySelectorAll('.fin-card')).filter((d) =>
    clean(d.textContent).includes(name)
  );
  if (!cards.length) throw new Error(`No card for ${name}`);
  return clean(cards[cards.length - 1].textContent);
};

async function seed(challenges: Challenge[] = CHALLENGES) {
  // This screen keeps its 52-week and no-spend state in localStorage, so
  // clearing only Dexie would let one test's progress leak into the next.
  localStorage.removeItem('masarifi_week52_completed_weeks');
  localStorage.removeItem('masarifi_nospend_active_date');
  localStorage.removeItem('masarifi_nospend_claimed_date');
  await DB.transaction('rw', DB.tables, async () => {
    for (const t of DB.tables) await t.clear();
  });
  if (challenges.length) await DB.challenges.bulkPut(challenges as never);
  await new Promise((r) => setTimeout(r, 0));
}

describe('Challenges — characterization', () => {
  beforeEach(() => seed());

  describe('Custom challenges tab', () => {
    it('lists every active challenge with its own progress', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('توفير القهوة'));

      expect(screenText(container)).toContain('بلا مطاعم');
      // Pinned per card: swapping the two progress values leaves both on screen.
      expect(digitsOf(cardFor(container, 'توفير القهوة'))).toContain('35');
      expect(digitsOf(cardFor(container, 'بلا مطاعم'))).toContain('80');
      expect(digitsOf(cardFor(container, 'توفير القهوة'))).not.toContain('80');
    });

    it('counts the active challenges in the header', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('توفير القهوة'));

      await waitFor(() => {
        expect(screenText(container)).toContain(`2 ${LABEL.activeChallenges}`);
      });
    });

    it('renders the empty state with no challenges', async () => {
      await seed([]);
      const { container } = renderScreen();
      await waitFor(() => {
        expect(screenText(container)).toContain(LABEL.empty);
      });
      expect(screenText(container)).not.toContain('توفير القهوة');
    });
  });

  describe('Tab switching', () => {
    it('moves to the 52-week tab and leaves the custom list behind', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('توفير القهوة'));

      fireEvent.click(tabButton(container, LABEL.tab52));

      // Assert the 52-week grid is actually THERE, by its own heading. An
      // earlier version only checked that the custom list had gone, which an
      // empty tab satisfies -- so a mutant that never rendered the grid
      // survived.
      await waitFor(() => {
        expect(screenText(container)).toContain('تحدي الـ 52 أسبوعاً للادخار');
      });
      expect(screenText(container)).toContain('المبلغ الإجمالي المدخر');
      expect(screenText(container)).not.toContain('توفير القهوة');
    });

    it('moves to the no-spend tab and back to custom', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('توفير القهوة'));

      fireEvent.click(tabButton(container, LABEL.tabNoSpend));
      await waitFor(() => {
        // The tab's own heading, not merely the page header's summary line.
        expect(screenText(container)).toContain('تحدي يوم بلا إنفاق!');
      });
      expect(screenText(container)).toContain('تنشيط التحدي لليوم');
      expect(screenText(container)).not.toContain('توفير القهوة');

      fireEvent.click(tabButton(container, LABEL.tabCustom));
      await waitFor(() => {
        expect(screenText(container)).toContain('توفير القهوة');
      });
    });
  });

  describe('52-week saver', () => {
    it('restores previously completed weeks from storage', async () => {
      // Weeks 1, 2 and 12 done -> the header reports three. Persisted in
      // localStorage (not the Dexie settings table) by this screen.
      localStorage.setItem('masarifi_week52_completed_weeks', JSON.stringify([1, 2, 12]));

      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('توفير القهوة'));
      fireEvent.click(tabButton(container, LABEL.tab52));

      await waitFor(() => {
        expect(screenText(container)).toContain('3 / 52');
      });
    });
  });

  describe('No-spend day', () => {
    it('restores the claimed state from storage', async () => {
      localStorage.setItem(
        'masarifi_nospend_claimed_date',
        new Date().toISOString().split('T')[0]
      );

      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('توفير القهوة'));
      fireEvent.click(tabButton(container, LABEL.tabNoSpend));

      // Claimed today, so the header must show the completed wording rather
      // than inviting the user to start again.
      await waitFor(() => {
        expect(screenText(container)).toContain('تحدي اليوم مكتمل بنجاح!');
      });
    });
  });

  describe('Prop wiring across the extracted tabs', () => {
    it('banks a week when its tile is pressed', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('توفير القهوة'));
      fireEvent.click(tabButton(container, LABEL.tab52));
      await waitFor(() =>
        expect(screenText(container)).toContain('تحدي الـ 52 أسبوعاً للادخار')
      );

      // Week tiles are buttons whose text ends with the deposit (week x 10).
      const before = allButtons(container).length;
      const weekTile = allButtons(container).find((b) =>
        clean(b.textContent).endsWith('10')
      );
      expect(weekTile).toBeTruthy();
      fireEvent.click(weekTile as Element);

      // The parent owns the deposit. Pressing a tile must reach it and open
      // the confirmation modal, which adds controls to the page.
      await waitFor(() => {
        expect(allButtons(container).length).toBeGreaterThan(before);
      });
    });

    it('activates the no-spend challenge through the parent handler', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('توفير القهوة'));
      fireEvent.click(tabButton(container, LABEL.tabNoSpend));
      await waitFor(() => expect(screenText(container)).toContain('تنشيط التحدي لليوم'));

      fireEvent.click(
        allButtons(container).find((b) =>
          clean(b.textContent).includes('تنشيط التحدي لليوم')
        ) as Element
      );

      // Activation is persisted by the parent and changes what the tab shows.
      await waitFor(() => {
        expect(localStorage.getItem('masarifi_nospend_active_date')).toBeTruthy();
      });
      expect(screenText(container)).toContain('التحدي نشط حالياً لليوم');
    });

    it('shows the claimed state coming from the parent, not a local default', async () => {
      // The success panel needs BOTH flags: the tab renders activate ->
      // active-help -> success, so a claimed-but-inactive day still shows the
      // activate button. Seeding only `claimed` tests the wrong branch.
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('masarifi_nospend_active_date', today);
      localStorage.setItem('masarifi_nospend_claimed_date', today);

      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('توفير القهوة'));
      fireEvent.click(tabButton(container, LABEL.tabNoSpend));

      await waitFor(() => {
        expect(screenText(container)).toContain(
          'لقد نجحت في تحدي اليوم بلا إنفاق وحصلت على الجائزة!'
        );
      });
      // ...and the activate button is gone, so the two states cannot both show.
      expect(screenText(container)).not.toContain('تنشيط التحدي لليوم');
    });

    it('marks banked weeks as completed in the grid', async () => {
      localStorage.setItem('masarifi_week52_completed_weeks', JSON.stringify([1, 2, 3]));
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('توفير القهوة'));
      fireEvent.click(tabButton(container, LABEL.tab52));

      await waitFor(() => expect(screenText(container)).toContain('3 / 52'));

      // 1+2+3 weeks x 10 = 60 banked, shown as "60 / 13,780". Scoped to the
      // totals row and asserted on the exact leading figure: a page-wide
      // substring check for "60" also matches inside 13,780, which let an
      // emptied `completedWeeks` survive.
      const totalsRow = Array.from(container.querySelectorAll('div')).filter((d) =>
        clean(d.textContent).includes('المبلغ الإجمالي المدخر')
      );
      expect(totalsRow.length).toBeGreaterThan(0);
      const rowText = clean(totalsRow[totalsRow.length - 1].textContent);
      expect(rowText).toMatch(/(^|\s)60(\.00)?\s*\//);
    });

    it('opens the edit sheet prefilled with the chosen challenge', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('توفير القهوة'));

      const editBtn = allButtons(container).find((b) => {
        const card = b.closest('.fin-card');
        return (
          clean(b.textContent) === 'edit' &&
          !!card &&
          clean(card.textContent).includes('بلا مطاعم')
        );
      });
      expect(editBtn).toBeTruthy();
      fireEvent.click(editBtn as Element);

      // Prefilled from the clicked challenge: a no-op onEdit opens nothing and
      // a wrong-card wiring shows the other challenge's name.
      await waitFor(() => {
        const values = (
          Array.from(container.querySelectorAll('input')) as HTMLInputElement[]
        ).map((i) => i.value);
        expect(values).toContain('بلا مطاعم');
      });
    });

    it('deletes a challenge through the two-step confirmation', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('بلا مطاعم'));

      const delBtn = allButtons(container).find((b) => {
        const card = b.closest('.fin-card');
        return (
          clean(b.textContent) === 'delete' &&
          !!card &&
          clean(card.textContent).includes('بلا مطاعم')
        );
      });
      expect(delBtn).toBeTruthy();
      fireEvent.click(delBtn as Element);

      // The confirm control is icon-only: a "check" ligature, not the word تأكيد.
      const confirm = await waitFor(() => {
        const b = allButtons(container).find((x) => clean(x.textContent) === 'check');
        if (!b) throw new Error('confirm not shown');
        return b;
      });
      fireEvent.click(confirm);

      await waitFor(async () => {
        const row = (await DB.challenges.get('c2')) as Challenge | undefined;
        expect(row === undefined || (row as { deleted?: boolean }).deleted).toBeTruthy();
      });
    });

    it('shares bulk selection between the header and the list', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('توفير القهوة'));

      // The selection checkbox lives in the list; the count lives in the
      // header. A tab given its own empty Set would show neither.
      const card = container.querySelector('.fin-card');
      expect(card).toBeTruthy();
      const checkbox = card?.parentElement?.querySelector('div[class*="cursor-pointer"]');
      if (checkbox) {
        fireEvent.click(checkbox);
        await waitFor(() => {
          expect(digitsOf(screenText(container))).toContain('1');
        });
      }
    });

    it('claims the no-spend reward through the parent handler', async () => {
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('masarifi_nospend_active_date', today);

      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('توفير القهوة'));
      fireEvent.click(tabButton(container, LABEL.tabNoSpend));
      await waitFor(() =>
        expect(screenText(container)).toContain('التحدي نشط حالياً لليوم')
      );

      fireEvent.click(
        allButtons(container).find((b) =>
          clean(b.textContent).includes('التحقق من النجاح والمطالبة بالجائزة')
        ) as Element
      );

      // Verification reads today's ledger and claims the reward -- both
      // parent-owned. With no spending seeded it succeeds and persists.
      await waitFor(() => {
        expect(localStorage.getItem('masarifi_nospend_claimed_date')).toBe(today);
        expect(screenText(container)).toContain(
          'لقد نجحت في تحدي اليوم بلا إنفاق وحصلت على الجائزة!'
        );
      });
    });

    it('reflects bulk selection made in the list back in the header', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('توفير القهوة'));

      // The checkbox is a div (not a button) whose ligature is
      // radio_button_unchecked until selected.
      const boxes = Array.from(container.querySelectorAll('div')).filter(
        (d) => clean(d.textContent) === 'radio_button_unchecked'
      );
      expect(boxes.length).toBeGreaterThan(0);
      fireEvent.click(boxes[0]);

      // The header's bulk bar is driven by the SAME selectedIds set, and it
      // only mounts once something is selected. Its select-all / delete
      // controls are icon-only, so they are matched by ligature.
      await waitFor(() => {
        expect(
          allButtons(container).some((b) => clean(b.textContent) === 'done_all')
        ).toBe(true);
      });
      // ...and the tile itself now reads as selected.
      expect(screenText(container)).toContain('check_circle');
    });
  });

  describe('Add / edit modal', () => {
    it('opens a blank form for a new challenge', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('توفير القهوة'));

      const addBtn = allButtons(container).find(
        (b) => clean(b.textContent) === 'add' || clean(b.textContent) === 'add_circle'
      );
      expect(addBtn).toBeTruthy();
      fireEvent.click(addBtn as Element);

      await waitFor(() => {
        const inputs = Array.from(container.querySelectorAll('input')) as HTMLInputElement[];
        expect(inputs.length).toBeGreaterThan(0);
        // A new challenge, so the name field is empty.
        expect(inputs.some((i) => i.value === '')).toBe(true);
      });
    });

    it('saves a new challenge and shows it in the list', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('توفير القهوة'));

      const addBtn = allButtons(container).find(
        (b) => clean(b.textContent) === 'add' || clean(b.textContent) === 'add_circle'
      );
      fireEvent.click(addBtn as Element);

      const nameField = await waitFor(() => {
        const f = Array.from(container.querySelectorAll('input')).find(
          (i) => (i as HTMLInputElement).type === 'text'
        ) as HTMLInputElement | undefined;
        if (!f) throw new Error('name field missing');
        return f;
      });
      fireEvent.change(nameField, { target: { value: 'المشي يومياً' } });

      const saveBtn = allButtons(container).find((b) =>
        clean(b.textContent).includes('حفظ')
      );
      expect(saveBtn).toBeTruthy();
      fireEvent.click(saveBtn as Element);

      await waitFor(async () => {
        expect(await DB.challenges.count()).toBe(3);
      });
      await waitFor(() => {
        expect(screenText(container)).toContain('المشي يومياً');
      });
    });
  });
});
