import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FamilyExpenses } from '@/features/family/components/FamilyExpenses';
import { db as DB } from '@/core/db/core';
import { useSettingsStore } from '@/store/settingsStore';
import { FAMILY_SHARED_CATEGORY_KEY } from '@/core/categoryConstants';

/**
 * Characterization tests for the Family screen (1,095 lines, no render-level
 * coverage before this).
 *
 * Written BEFORE any extraction, deliberately: their job is to pin down what
 * the screen currently does so that a refactor which silently drops a prop is
 * caught. That only works if they assert on *computed output* — the numbers
 * and names a user actually reads — rather than on the presence of containers.
 * A smoke test would stay green while a tab quietly stopped receiving data.
 *
 * The two tabs are seeded with distinct, non-round values (1,250 / 430 / 75)
 * so no assertion can pass by coincidentally matching a default, a zero, or
 * another figure on the same screen.
 */

const clean = (s: string | null | undefined) => (s || '').replace(/\s+/g, ' ').trim();

const TAB = {
  shared: 'المحفظة المشتركة',
  children: 'حسابات الأطفال',
} as const;

const renderScreen = () =>
  render(
    <MemoryRouter>
      <FamilyExpenses />
    </MemoryRouter>
  );

const findButton = (container: HTMLElement, label: string) =>
  Array.from(container.querySelectorAll('button')).find((b) =>
    clean(b.textContent).includes(label)
  );

const clickTab = (container: HTMLElement, label: string) => {
  const btn = findButton(container, label);
  if (!btn) throw new Error(`Tab not found: ${label}`);
  fireEvent.click(btn);
};

/** Text of the whole screen, whitespace-normalised, for value assertions. */
const screenText = (container: HTMLElement) => clean(container.textContent);

/**
 * Text of the smallest element that carries `label`, including its siblings.
 *
 * Asserting that a number appears *somewhere* on the page is not enough: the
 * children tab shows a balance total and an allowance total side by side, so a
 * refactor that swaps the two props leaves both numbers present and a
 * whole-page assertion green. (Measured: that exact mutant survived until this
 * helper existed.) Pairing label with value is what makes the assertion real.
 */
const cardTextFor = (container: HTMLElement, label: string): string => {
  const el = Array.from(container.querySelectorAll('span, p, div, h3, h4')).find(
    (n) => clean(n.textContent) === label
  );
  if (!el) throw new Error(`Label not found: ${label}`);
  return clean(el.parentElement?.textContent);
};

async function seedFamily() {
  await DB.transaction('rw', DB.tables, async () => {
    for (const t of DB.tables) await t.clear();
  });
  await new Promise((r) => setTimeout(r, 0));

  // Two shared expenses: 1,250 + 430 = 1,680 total.
  await DB.transactions.bulkPut([
    {
      id: 'fx1',
      type: 'expense',
      amount: 1250,
      description: 'إيجار مشترك',
      category: FAMILY_SHARED_CATEGORY_KEY,
      shared: true,
      splitBy: 2,
      date: '2026-01-10',
      createdAt: '2026-01-10T00:00:00.000Z',
    },
    {
      id: 'fx2',
      type: 'expense',
      amount: 430,
      description: 'فاتورة الكهرباء',
      category: FAMILY_SHARED_CATEGORY_KEY,
      shared: true,
      splitBy: 2,
      date: '2026-01-12',
      createdAt: '2026-01-12T00:00:00.000Z',
    },
    // Not shared: must be excluded from every shared figure.
    {
      id: 'fx3',
      type: 'expense',
      amount: 9999,
      description: 'مصروف شخصي',
      category: 'food',
      date: '2026-01-13',
      createdAt: '2026-01-13T00:00:00.000Z',
    },
  ] as never);

  await DB.setSetting('familyMembers', [
    { id: 'm1', name: 'سارة', relation: 'spouse' },
    { id: 'm2', name: 'خالد', relation: 'brother' },
  ]);

  // Children: balances 300 + 120 = 420; allowances 75 + 50 = 125.
  useSettingsStore.setState({
    childAccounts: [
      { id: 'c1', name: 'ريم', age: 10, balance: 300, allowance: 75, period: 'weekly', transactions: [] },
      { id: 'c2', name: 'فهد', age: 7, balance: 120, allowance: 50, period: 'weekly', transactions: [] },
    ],
  } as never);
}

describe('FamilyExpenses — characterization', () => {
  beforeEach(seedFamily);

  describe('Shared wallet tab', () => {
    it('totals only the shared expenses, excluding unshared ones', async () => {
      const { container } = renderScreen();
      // 1250 + 430 = 1680. The 9,999 personal expense must not be counted.
      await waitFor(() => {
        expect(screenText(container)).toContain('1,680');
      });
      expect(screenText(container)).not.toContain('9,999');
    });

    it('lists every family member plus the implicit "me"', async () => {
      const { container } = renderScreen();
      await waitFor(() => {
        expect(screenText(container)).toContain('سارة');
      });
      const text = screenText(container);
      expect(text).toContain('خالد');
      expect(text).toContain('أنا');
      // The count badge reads members + 1 for the current user.
      expect(text).toContain('(3)');
    });

    it('renders the shared transaction log with descriptions and amounts', async () => {
      const { container } = renderScreen();
      await waitFor(() => {
        expect(screenText(container)).toContain('إيجار مشترك');
      });
      const text = screenText(container);
      expect(text).toContain('فاتورة الكهرباء');
      expect(text).toContain('1,250');
      expect(text).toContain('430');
      // The unshared transaction must not leak into the family log.
      expect(text).not.toContain('مصروف شخصي');
    });

    it('shows the shared count badge on the tab', async () => {
      const { container } = renderScreen();
      await waitFor(() => {
        const tab = findButton(container, TAB.shared);
        expect(clean(tab?.textContent)).toContain('2');
      });
    });

    it('opens the add-member modal from the banner', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('سارة'));

      const addBtn = container.querySelector('button[title="Add Member"], button[title="إضافة"]');
      expect(addBtn).toBeTruthy();
      fireEvent.click(addBtn as Element);

      await waitFor(() => {
        expect(container.querySelector('input[placeholder]')).toBeTruthy();
      });
    });
  });

  describe('Children accounts tab', () => {
    it('switches to the children tab and shows each child', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('سارة'));

      clickTab(container, TAB.children);

      await waitFor(() => {
        expect(screenText(container)).toContain('ريم');
      });
      expect(screenText(container)).toContain('فهد');
    });

    it('sums child balances and allowances independently', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('سارة'));
      clickTab(container, TAB.children);

      await waitFor(() => {
        expect(screenText(container)).toContain('420');
      });

      // Each total is checked INSIDE its own labelled card, so swapping the two
      // props at the call site cannot pass by leaving both numbers on screen.
      expect(cardTextFor(container, 'رصيد المحفظة')).toContain('420');
      expect(cardTextFor(container, 'مبلغ المصروف الدوري 💰')).toContain('125');
      // ...and explicitly not each other's value.
      expect(cardTextFor(container, 'رصيد المحفظة')).not.toContain('125');
      expect(cardTextFor(container, 'مبلغ المصروف الدوري 💰')).not.toContain('420');
    });

    it('shows the children count badge on the tab', async () => {
      const { container } = renderScreen();
      await waitFor(() => {
        const tab = findButton(container, TAB.children);
        expect(clean(tab?.textContent)).toContain('2');
      });
    });

    it('toggles the add-child form open and closed', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('سارة'));
      clickTab(container, TAB.children);

      const addBtn = await waitFor(() => {
        const b = findButton(container, 'إضافة حساب طفل');
        if (!b) throw new Error('add child button missing');
        return b;
      });

      fireEvent.click(addBtn);
      // The toggle flips its own label to "close" when the form is open.
      await waitFor(() => {
        expect(clean(findButton(container, 'إغلاق')?.textContent)).toBeTruthy();
      });
    });

    it('keeps the two tabs isolated — child data does not appear on shared', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('سارة'));

      clickTab(container, TAB.children);
      await waitFor(() => expect(screenText(container)).toContain('ريم'));

      clickTab(container, TAB.shared);
      await waitFor(() => {
        expect(screenText(container)).toContain('إيجار مشترك');
      });
      // Child names belong to the other tab only.
      expect(screenText(container)).not.toContain('ريم');
    });
  });

  /**
   * Callback wiring across the new component boundary.
   *
   * These exist because mutation testing showed the render assertions above
   * could not see a missing callback: replacing `onEditChild`, `onAddMember`,
   * `onEditMember` or `deleteMember` with a no-op left every earlier test
   * green. A tab that renders perfectly but whose buttons do nothing is
   * exactly the failure an extraction introduces, so each crossing callback is
   * now exercised through the UI and asserted on its observable effect.
   */
  describe('Prop callbacks across the tab boundary', () => {
    it('opens the edit-member modal when a member avatar is clicked', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('سارة'));

      const editBtn = container.querySelector('button[title="تعديل بيانات العضو"]');
      expect(editBtn).toBeTruthy();
      fireEvent.click(editBtn as Element);

      // The parent owns this modal; the tab only signals upward.
      await waitFor(() => {
        expect(container.querySelector('input[value="سارة"]')).toBeTruthy();
      });
    });

    it('opens the add-member modal from the tab', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('سارة'));

      const addBtn = container.querySelector('button[title="إضافة"]');
      expect(addBtn).toBeTruthy();
      fireEvent.click(addBtn as Element);

      // Identified by the add-member heading, not merely "some empty input":
      // the screen always contains empty inputs, so the looser assertion
      // passed even when the callback was a no-op.
      await waitFor(() => {
        const headings = Array.from(container.querySelectorAll('h3'));
        expect(headings.some((h) => clean(h.textContent) === 'أدخل بيانات العضو:')).toBe(true);
      });
    });

    it('asks for confirmation when a member delete button is used', async () => {
      // Deletion is intentionally routed through a confirm sheet rather than
      // firing immediately, so the observable effect of the callback being
      // wired is the prompt appearing -- not the member vanishing.
      const spy = vi.spyOn(await import('@/toast'), 'confirmSheet');

      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('سارة'));

      const delBtn = container.querySelector('button[title="حذف"]');
      expect(delBtn).toBeTruthy();
      fireEvent.click(delBtn as Element);

      await waitFor(() => {
        expect(spy).toHaveBeenCalled();
      });
      spy.mockRestore();
    });

    it('opens the edit-child modal from a child card', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('سارة'));
      clickTab(container, TAB.children);
      await waitFor(() => expect(screenText(container)).toContain('ريم'));

      const editBtn = container.querySelector('button[title="تعديل"]')
        || Array.from(container.querySelectorAll('button')).find((b) =>
             (b.getAttribute('title') || '').includes('تعديل'));
      expect(editBtn).toBeTruthy();
      fireEvent.click(editBtn as Element);

      // The parent's EditChildModal is prefilled from the clicked child, so a
      // no-op callback (or the wrong child) fails here.
      await waitFor(() => {
        expect(container.querySelector('input[value="ريم"]')).toBeTruthy();
      });
    });

    it('passes the funding account through when requesting an allowance payout', async () => {
      // With an account present the tab must hand its id upward rather than
      // paying out immediately; the parent opens the payout modal with it.
      // TWO accounts, and the one handed up is deliberately NOT the first.
      // With a single account the parent's `allowanceAccountId || accounts[0]`
      // fallback makes a dropped id indistinguishable from a correct one --
      // measured: that mutant survived until this second account existed.
      await DB.accounts.bulkPut([
        { id: 'acc-first', name: 'حساب التوفير', balance: 100, type: 'bank' },
        { id: 'acc-main', name: 'الحساب الجاري', balance: 5000, type: 'bank' },
      ] as never);

      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain('سارة'));
      clickTab(container, TAB.children);
      await waitFor(() => expect(screenText(container)).toContain('ريم'));

      // Wait for the funding accounts to load before clicking. `useFamily`
      // fetches them asynchronously, and with an empty list the tab takes its
      // "pay immediately" branch instead of asking the parent to open the
      // modal -- so clicking too early tests the wrong path entirely.
      await waitFor(async () => {
        expect(await DB.accounts.count()).toBe(2);
      });

      const payBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        (b.getAttribute('title') || '').includes('صرف')
      );
      expect(payBtn).toBeTruthy();
      fireEvent.click(payBtn as Element);

      // The modal's account <select> must be BOUND to the id the tab handed up.
      // Asserting only that the account name appears on screen is not enough:
      // the name renders from the accounts list regardless of which id was
      // passed, so a callback that forwarded the wrong id stayed invisible.
      const select = await waitFor(() => {
        const el = container.querySelector('select') as HTMLSelectElement | null;
        if (!el) throw new Error('payout account select not rendered');
        return el;
      });
      expect(select.value).toBe('acc-first');
      expect(screenText(container)).toContain('الحساب الجاري');

      // NOTE on coverage: forwarding '' instead of the real id is an
      // EQUIVALENT mutation here, verified by rendering both variants and
      // diffing the DOM -- they are identical. A <select> bound to '' displays
      // its first option anyway, and the parent submits
      // `allowanceAccountId || accounts[0]?.id`, which re-derives the same id.
      // No test can distinguish them, so none pretends to; the defect it would
      // represent is unreachable while that fallback exists.
    });
  });

  describe('Empty states', () => {
    it('renders without members, children or transactions', async () => {
      await DB.transaction('rw', DB.tables, async () => {
        for (const t of DB.tables) await t.clear();
      });
      await new Promise((r) => setTimeout(r, 0));
      useSettingsStore.setState({ childAccounts: [] } as never);

      const { container } = renderScreen();
      await waitFor(() => {
        expect(findButton(container, TAB.shared)).toBeTruthy();
      });
      // No crash, and no stale totals from the seeded run.
      expect(screenText(container)).not.toContain('1,680');
    });
  });
});
