import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ZakatCalculator } from '@/features/zakat/components/ZakatCalculator';
import { db as DB } from '@/core/db/core';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * Characterization tests for the Zakat calculator (964 lines).
 *
 * Written BEFORE any extraction, and deliberately written to describe what the
 * screen CURRENTLY computes rather than what the fiqh engine says it should.
 * Those two disagree today — see the note on `livestock` below — and the point
 * of a characterization suite is to hold behaviour still while the structure
 * moves. Changing the sums and restructuring at the same time would leave no
 * way to tell which of the two broke something.
 *
 * Values are chosen so every intermediate is distinguishable: gold at 500/g
 * makes the gold nisab exactly 42,500, and the asset figures below never
 * coincide with each other, with a nisab, or with a zakat amount.
 */

const clean = (s: string | null | undefined) => (s || '').replace(/\s+/g, ' ').trim();
const screenText = (c: HTMLElement) => clean(c.textContent);

/** Digits only, so assertions survive currency symbols and RTL marks. */
const digitsOf = (s: string) => s.replace(/[^\d]/g, '');

const LABEL = {
  cash: 'السيولة النقدية والبنكية',
  invest: 'الأسهم والصناديق الاستثمارية',
  trade: 'عروض التجارة والبضائع',
  livestock: 'الأنعام والمواشي',
  realestate: 'العقارات الاستثمارية',
  crops: 'الزروع والثمار',
  liabilities: 'الديون والخصوم المستحقة',
  excludedNotice: 'هذه الأصول لا تجب فيها زكاة النقدين (٢٫٥٪) ولها أحكامها الخاصة',
  netBase: 'الوعاء الزكوي الصافي',
  estimate: 'تقديري',
  hawlUnknown: 'لم يُحدَّد تاريخ بلوغ النصاب، والمبلغ تقديري حتى يتم الحول.',
  hawlComplete: 'تمّ الحول، والزكاة مستحقة الآن.',
} as const;

const renderScreen = () =>
  render(
    <MemoryRouter>
      <ZakatCalculator />
    </MemoryRouter>
  );

/**
 * The numeric input belonging to a labelled asset row.
 *
 * Rows are matched by their visible label rather than by order or by class:
 * an extraction that reorders the list, or renders the right label against the
 * wrong input, must fail here.
 */
const assetInput = (c: HTMLElement, label: string): HTMLInputElement => {
  // The row is the SMALLEST element that carries both the label and an input.
  // Taking the innermost label match lands on the text wrapper, which has no
  // input; taking the outermost lands on the whole list, whose first input
  // belongs to another asset entirely.
  const rows = Array.from(c.querySelectorAll('div')).filter(
    (d) => clean(d.textContent).includes(label) && d.querySelector('input')
  );
  if (!rows.length) throw new Error(`No asset row with an input for ${label}`);
  return rows[rows.length - 1].querySelector('input') as HTMLInputElement;
};

/** The liabilities input, found by its label. */
const liabilitiesInput = (c: HTMLElement): HTMLInputElement => {
  const rows = Array.from(c.querySelectorAll('div')).filter(
    (d) => clean(d.textContent).includes(LABEL.liabilities) && d.querySelector('input')
  );
  if (!rows.length) throw new Error('No liabilities input');
  return rows[rows.length - 1].querySelector('input') as HTMLInputElement;
};

/** The net-zakatable-base row. */
const netBaseRow = (c: HTMLElement): string => {
  const rows = Array.from(c.querySelectorAll('div')).filter((d) =>
    clean(d.textContent).includes(LABEL.netBase)
  );
  if (!rows.length) throw new Error('No net base row');
  return clean(rows[rows.length - 1].textContent);
};

/** A top-level tab button, matched on its visible label. */
const tabButton = (c: HTMLElement, label: string): Element | undefined =>
  Array.from(c.querySelectorAll('button')).find((b) =>
    clean(b.textContent).endsWith(label)
  );

/**
 * The numeric amount in the banner, as an exact number.
 *
 * A substring check is not good enough here: "250" is contained in "2500", so
 * a mutated nisab that produced a ten-fold amount still passed. Parsing the
 * first number out of the banner lets the assertions be exact.
 */
const bannerValue = (c: HTMLElement): number => {
  const m = bannerAmount(c).match(/[\d,]+(?:\.\d+)?/);
  if (!m) throw new Error(`No number in banner: ${bannerAmount(c)}`);
  return Number(m[0].replace(/,/g, ''));
};

/** The headline zakat figure in the banner. */
const bannerAmount = (c: HTMLElement): string => {
  const heading = Array.from(c.querySelectorAll('h2')).find((h) =>
    clean(h.textContent).includes('إجمالي الزكاة المستحقة')
  );
  if (!heading) throw new Error('zakat banner not rendered');
  const section = heading.closest('section');
  if (!section) throw new Error('banner section missing');
  // Strip the heading itself so its text cannot be mistaken for the value.
  const body = clean(section.textContent).replace(clean(heading.textContent), '');
  return body;
};

/**
 * The banner animates its figure over a second with requestAnimationFrame, so
 * a test that reads it immediately catches a meaningless intermediate value.
 * Rather than wait out the animation (slow) or fake timers (rAF does not
 * cooperate), declare a reduced-motion preference: `AnimatedNumber` already
 * honours it by snapping straight to the final value. The test therefore also
 * exercises the accessibility path that real users with that setting get.
 */
function stubReducedMotion() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
}

async function wipe() {
  stubReducedMotion();
  useSettingsStore.setState({ unlockedItems: [] } as never);
  await DB.transaction('rw', DB.tables, async () => {
    for (const t of DB.tables) await t.clear();
  });
  // Gold 500/g and silver 9/g are the component's own defaults; pinning them
  // in settings keeps the nisab deterministic without stubbing the network.
  await DB.setSetting('lastGoldPrice', '500');
  await DB.setSetting('lastSilverPrice', '9');
  await new Promise((r) => setTimeout(r, 0));
}

const typeAsset = (c: HTMLElement, label: string, value: string) =>
  fireEvent.change(assetInput(c, label), { target: { value } });

describe('ZakatCalculator — characterization', () => {
  beforeEach(wipe);

  describe('Nisab threshold', () => {
    it('charges nothing while total assets sit below the gold nisab', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.cash));

      // 42,500 is the gold nisab at 500/g; 40,000 is deliberately just under.
      typeAsset(container, LABEL.cash, '40000');

      await waitFor(() => {
        expect(screenText(container)).toContain('لا يبلغ النصاب');
      });
      // Nothing due, and the nisab itself is shown so the user knows the gap.
      expect(bannerValue(container)).toBe(0);
      expect(digitsOf(screenText(container))).toContain('42500');
    });

    it('charges 2.5% once the gold nisab is reached', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.cash));

      // 100,000 -> 2,500 due. Both figures are unique on this screen.
      typeAsset(container, LABEL.cash, '100000');

      await waitFor(() => {
        expect(bannerValue(container)).toBe(2500);
      });
      expect(screenText(container)).not.toContain('لا يبلغ النصاب');
    });

    it('switches the threshold when the silver nisab is selected', async () => {
      // Silver is a Pro perk. Without the entitlement the button only raises a
      // toast, so the earlier version of this test clicked a locked control and
      // asserted nothing -- a mutant that ignored `nisabMethod` entirely
      // survived it.
      useSettingsStore.setState({ unlockedItems: ['perk:zakat-pro'] } as never);

      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.cash));

      // Silver nisab is 595 x 9 = 5,355, far below the gold 42,500. An amount
      // between the two is charged under silver and exempt under gold, which
      // is what makes this assertion sensitive to the method actually changing.
      // 2,000 is chosen to sit BELOW the real silver nisab (595 x 9 = 5,355)
      // and above a wrongly-shrunk one, so the exempt assertion further down
      // pins the 595 grams rather than merely "some silver threshold".
      typeAsset(container, LABEL.cash, '2000');
      await waitFor(() => expect(screenText(container)).toContain('لا يبلغ النصاب'));

      const silverBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        clean(b.textContent).includes('نصاب الفضة')
      );
      expect(silverBtn).toBeTruthy();
      fireEvent.click(silverBtn as Element);

      // Still exempt: 2,000 < 5,355, so switching method alone must not make
      // zakat due. A shrunken silver nisab would wrongly charge here.
      await waitFor(() => {
        expect(digitsOf(screenText(container))).toContain('5355');
      });
      expect(screenText(container)).toContain('لا يبلغ النصاب');
      expect(bannerValue(container)).toBe(0);
      // The displayed threshold is the silver one, not the gold 42,500.
      expect(digitsOf(screenText(container))).not.toContain('42500');

      // And once past the silver threshold it charges: 8,000 x 2.5% = 200.
      typeAsset(container, LABEL.cash, '8000');
      await waitFor(() => {
        expect(bannerValue(container)).toBe(200);
      });
    });
  });

  describe('Asset aggregation', () => {
    it('adds several monetary buckets into one base', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.cash));

      // 60,000 + 30,000 + 10,000 = 100,000 -> 2,500.
      typeAsset(container, LABEL.cash, '60000');
      typeAsset(container, LABEL.invest, '30000');
      typeAsset(container, LABEL.trade, '10000');

      await waitFor(() => {
        expect(bannerValue(container)).toBe(2500);
      });
    });

    it('excludes livestock from the 2.5% base, per the canonical fiqh', async () => {
      // INVERTED from the characterization test that pinned the old defect.
      //
      // Livestock zakat is a fixed in-kind amount (one sheep per 40 head and
      // so on), never a percentage of market value. Sweeping it into the 2.5%
      // base over-charged users, which is a religious harm and not merely a
      // rounding error. The screen now delegates to core/zakatEngine.ts.
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.livestock));

      typeAsset(container, LABEL.livestock, '100000');

      // Nothing due: the monetary base is still empty.
      await waitFor(() => {
        expect(bannerValue(container)).toBe(0);
      });
      // The exact figure is already pinned at 0 above. A substring check is
      // useless here anyway: "2500" occurs inside the 42,500 nisab that the
      // banner prints alongside it.
      expect(screenText(container)).toContain('لا يبلغ النصاب');
    });

    it('excludes crops and property too, and reports them separately', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.cash));

      typeAsset(container, LABEL.crops, '50000');
      typeAsset(container, LABEL.realestate, '300000');

      await waitFor(() => {
        expect(bannerValue(container)).toBe(0);
      });
      // The user is told these need a separate ruling rather than being
      // silently dropped -- excluding wealth without saying so is its own
      // failure mode.
      expect(screenText(container)).toContain(LABEL.excludedNotice);
    });

    it('charges only the monetary buckets when both kinds are present', async () => {
      // The discriminating case: 100,000 cash (chargeable) alongside 160,000
      // of exempt wealth. The old code charged 4,125 on the combined 265,000.
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.cash));

      typeAsset(container, LABEL.cash, '100000');
      typeAsset(container, LABEL.livestock, '40000');
      typeAsset(container, LABEL.crops, '20000');
      typeAsset(container, LABEL.realestate, '100000');

      // 100,000 x 2.5% = 2,500 -- NOT 265,000 x 2.5% = 6,625.
      await waitFor(() => {
        expect(bannerValue(container)).toBe(2500);
      });
    });

    it('deducts immediately-due liabilities from the base', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.cash));

      typeAsset(container, LABEL.cash, '100000');
      await waitFor(() => expect(bannerValue(container)).toBe(2500));

      // 100,000 - 40,000 = 60,000 -> 1,500 due.
      fireEvent.change(liabilitiesInput(container), { target: { value: '40000' } });
      await waitFor(() => {
        expect(bannerValue(container)).toBe(1500);
      });
    });

    it('drops below nisab once liabilities eat the surplus', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.cash));

      typeAsset(container, LABEL.cash, '50000');
      await waitFor(() => expect(bannerValue(container)).toBe(1250));

      // 50,000 - 20,000 = 30,000, below the 42,500 gold nisab. A debtor who
      // no longer holds a nisab owes nothing at all.
      fireEvent.change(liabilitiesInput(container), { target: { value: '20000' } });
      await waitFor(() => {
        expect(bannerValue(container)).toBe(0);
      });
      expect(screenText(container)).toContain('لا يبلغ النصاب');
    });

    it('includes gold in the zakatable base', async () => {
      // The gold row is not a plain input (it opens the karat calculator), so
      // it is seeded through the persisted value the component loads.
      await DB.setSetting('zakatAssets', JSON.stringify({
        cash: '', gold: '100000', invest: '', trade: '',
        livestock: '', crops: '', realestate: '',
      }));

      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.cash));

      // 100,000 of gold x 2.5% = 2,500. Dropping gold from the engine input
      // would silently exempt jewellery, which is squarely zakatable.
      await waitFor(() => {
        expect(bannerValue(container)).toBe(2500);
      });
    });

    it('shows the net zakatable base after debts', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.cash));

      typeAsset(container, LABEL.cash, '100000');
      fireEvent.change(liabilitiesInput(container), { target: { value: '30000' } });

      // The user must be able to see WHAT the 2.5% was taken on: 70,000.
      await waitFor(() => {
        expect(digitsOf(netBaseRow(container))).toContain('70000');
      });
      expect(bannerValue(container)).toBe(1750);
    });
  });

  describe('Hawl (lunar year)', () => {
    it('presents the figure as an estimate when no nisab date is recorded', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.cash));

      typeAsset(container, LABEL.cash, '100000');
      await waitFor(() => expect(bannerValue(container)).toBe(2500));

      // Zakat is not actually due until a lunar year passes over wealth that
      // has held nisab. Announcing a confident obligation before then
      // misstates the ruling, so the screen must qualify it.
      expect(screenText(container)).toContain(LABEL.estimate);
      expect(screenText(container)).toContain(LABEL.hawlUnknown);
    });

    it('reports the hawl as complete once a lunar year has passed', async () => {
      // 400 days ago -- comfortably past the 354-day hawl.
      const past = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      await DB.setSetting('zakatNisabReachedDate', past);

      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.cash));
      typeAsset(container, LABEL.cash, '100000');

      await waitFor(() => {
        expect(screenText(container)).toContain(LABEL.hawlComplete);
      });
      // Now it is a genuine obligation, so the estimate qualifier goes away.
      expect(screenText(container)).not.toContain(LABEL.estimate);
    });

    it('counts down the remaining days when the hawl is incomplete', async () => {
      // 54 days ago -> 300 remaining of 354.
      const recent = new Date(Date.now() - 54 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      await DB.setSetting('zakatNisabReachedDate', recent);

      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.cash));
      typeAsset(container, LABEL.cash, '100000');

      await waitFor(() => {
        expect(digitsOf(screenText(container))).toContain('300');
      });
      // Still an estimate: the year has not turned.
      expect(screenText(container)).toContain(LABEL.estimate);
      expect(screenText(container)).not.toContain(LABEL.hawlComplete);
    });
  });

  describe('Tabs', () => {
    it('starts on the zakat tab and can switch to history', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.cash));

      // Button text also carries the material icon ligature ("history"), so
      // match on a contained label rather than on equality.
      const historyTab = tabButton(container, 'السجل');
      expect(historyTab).toBeTruthy();
      fireEvent.click(historyTab as Element);

      // The asset editor belongs to the other tab and must go away.
      await waitFor(() => {
        expect(screenText(container)).not.toContain(LABEL.cash);
      });
    });

    it('returns to the zakat tab with the entered assets intact', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.cash));
      typeAsset(container, LABEL.cash, '100000');
      await waitFor(() => expect(bannerValue(container)).toBe(2500));

      fireEvent.click(tabButton(container, 'السجل') as Element);
      await waitFor(() => expect(screenText(container)).not.toContain(LABEL.cash));

      fireEvent.click(tabButton(container, 'الزكاة') as Element);

      // State survives the round trip — it lives above the tab, and must keep
      // living there after the split.
      await waitFor(() => expect(screenText(container)).toContain(LABEL.cash));
      expect(assetInput(container, LABEL.cash).value).toBe('100000');
      expect(bannerValue(container)).toBe(2500);
    });
  });

  describe('Saving a calculation', () => {
    it('offers the save action only once the nisab is met', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.cash));

      const saveButton = () =>
        Array.from(container.querySelectorAll('button')).find((b) =>
          clean(b.textContent).includes('حفظ العملية')
        );

      typeAsset(container, LABEL.cash, '1000');
      await waitFor(() => expect(screenText(container)).toContain('لا يبلغ النصاب'));
      expect(saveButton()).toBeFalsy();

      typeAsset(container, LABEL.cash, '100000');
      await waitFor(() => {
        expect(saveButton()).toBeTruthy();
      });
    });
  });

  /**
   * Props crossing the new component boundaries.
   *
   * Mutation testing showed the suite above was blind to five of them: a frozen
   * nisab selector, a dead save button, an emptied history list, a forced Pro
   * flag and a zeroed gold value all left every assertion green. A calculator
   * that renders the right numbers but whose controls are inert is exactly what
   * an extraction breaks, so each crossing prop is now exercised end to end.
   */
  describe('Prop wiring across the extracted components', () => {
    it('saves a calculation and shows it in the history tab', async () => {
      useSettingsStore.setState({ unlockedItems: ['perk:zakat-pro'] } as never);
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.cash));

      typeAsset(container, LABEL.cash, '100000');
      await waitFor(() => expect(bannerValue(container)).toBe(2500));

      const save = Array.from(container.querySelectorAll('button')).find((b) =>
        clean(b.textContent).includes('حفظ العملية')
      );
      expect(save).toBeTruthy();
      fireEvent.click(save as Element);

      // Persisted...
      await waitFor(async () => {
        const raw = (await DB.getSetting('zakatHistory')) as string | undefined;
        expect(raw).toBeTruthy();
        expect(JSON.parse(raw as string)).toHaveLength(1);
      });

      // ...and rendered in the history tab, which is a different component.
      fireEvent.click(tabButton(container, 'السجل') as Element);
      await waitFor(() => {
        expect(screenText(container)).not.toContain('No saved calculations yet');
      });
      expect(digitsOf(screenText(container))).toContain('2500');
    });

    it('locks the history tab behind the Pro perk', async () => {
      // Default state has no entitlement, so the tab must show the upsell
      // rather than an empty list -- proving `isPro` is really threaded down.
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.cash));

      fireEvent.click(tabButton(container, 'السجل') as Element);
      await waitFor(() => {
        expect(screenText(container)).not.toContain('No saved calculations yet');
      });
      // The shop call-to-action belongs to the locked state only.
      const shopBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        clean(b.textContent).length > 0 && b.className.includes('bg-[#002b59]')
      );
      expect(shopBtn).toBeTruthy();
    });

    it('shows the gold value computed by the parent on the gold row', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.cash));

      // The gold row renders a parent-computed figure rather than an input, so
      // a dropped `goldValue` prop shows 0 while the banner still totals it.
      await DB.setSetting('zakatAssets', JSON.stringify({
        cash: '', gold: '7777', invest: '', trade: '',
        livestock: '', crops: '', realestate: '',
      }));

      const { container: c2 } = renderScreen();
      await waitFor(() => {
        expect(digitsOf(screenText(c2))).toContain('7777');
      });
    });

    it('marks the selected nisab method in the selector', async () => {
      useSettingsStore.setState({ unlockedItems: ['perk:zakat-pro'] } as never);
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.cash));

      const goldBtn = () =>
        Array.from(container.querySelectorAll('button')).find((b) =>
          clean(b.textContent).includes('نصاب الذهب')
        ) as HTMLButtonElement;
      const silverBtn = () =>
        Array.from(container.querySelectorAll('button')).find((b) =>
          clean(b.textContent).includes('نصاب الفضة')
        ) as HTMLButtonElement;

      // Gold is selected initially; the active pill carries the amber styling.
      expect(goldBtn().className).toContain('bg-amber-100');
      expect(silverBtn().className).not.toContain('bg-slate-100');

      fireEvent.click(silverBtn());

      // The highlight must MOVE -- a frozen `nisabMethod` prop leaves the
      // selector visually stuck on gold even though the sums change.
      await waitFor(() => {
        expect(silverBtn().className).toContain('bg-slate-100');
      });
      expect(goldBtn().className).not.toContain('bg-amber-100');
    });

    it('keeps the silver nisab locked without the Pro perk', async () => {
      // No entitlement: clicking silver must NOT change the threshold. This
      // pins `isPro` on the banner -- forcing it true silently unlocks a paid
      // feature, which no other assertion noticed.
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.cash));

      typeAsset(container, LABEL.cash, '10000');
      await waitFor(() => expect(screenText(container)).toContain('لا يبلغ النصاب'));

      const silverBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        clean(b.textContent).includes('نصاب الفضة')
      );
      fireEvent.click(silverBtn as Element);

      // Still on the gold threshold, so 10,000 stays exempt and the gold
      // nisab is still the figure shown.
      await new Promise((r) => setTimeout(r, 30));
      expect(screenText(container)).toContain('لا يبلغ النصاب');
      expect(bannerValue(container)).toBe(0);
      expect(digitsOf(screenText(container))).toContain('42500');
    });

    it('expands a history row to reveal its asset breakdown', async () => {
      useSettingsStore.setState({ unlockedItems: ['perk:zakat-pro'] } as never);
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.cash));

      // 64,000 cash is distinctive enough to find inside the breakdown.
      typeAsset(container, LABEL.cash, '64000');
      await waitFor(() => expect(bannerValue(container)).toBe(1600));
      fireEvent.click(
        Array.from(container.querySelectorAll('button')).find((b) =>
          clean(b.textContent).includes('حفظ العملية')
        ) as Element
      );
      await waitFor(async () => {
        expect((await DB.getSetting('zakatHistory')) as string).toBeTruthy();
      });

      fireEvent.click(tabButton(container, 'السجل') as Element);
      await waitFor(() => expect(digitsOf(screenText(container))).toContain('1600'));

      // Collapsed: the per-asset breakdown is not shown yet.
      expect(screenText(container)).not.toContain(LABEL.cash);

      // The clickable element is the row header div; its text also carries the
      // chevron ligature, so match on "contains" rather than on a suffix.
      const rowHeaders = Array.from(container.querySelectorAll('div')).filter((el) =>
        clean(el.textContent).includes('التفاصيل')
      );
      expect(rowHeaders.length).toBeGreaterThan(0);
      fireEvent.click(rowHeaders[rowHeaders.length - 1]);

      // Expanded: the breakdown row appears, proving the callback reaches the
      // parent's state and flows back down as `expandedIndex`.
      await waitFor(() => {
        expect(screenText(container)).toContain(LABEL.cash);
      });
      expect(digitsOf(screenText(container))).toContain('64000');
    });

    it('locks the history LIST behind the Pro perk, not just the banner', async () => {
      // Distinct from the banner check: `isPro` is threaded to two components,
      // and forcing it true on the history tab alone leaks saved calculations
      // to non-subscribers. Save one first so there is something to leak.
      useSettingsStore.setState({ unlockedItems: ['perk:zakat-pro'] } as never);
      const { container, unmount } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.cash));
      typeAsset(container, LABEL.cash, '52000');
      await waitFor(() => expect(bannerValue(container)).toBe(1300));
      fireEvent.click(
        Array.from(container.querySelectorAll('button')).find((b) =>
          clean(b.textContent).includes('حفظ العملية')
        ) as Element
      );
      await waitFor(async () => {
        expect((await DB.getSetting('zakatHistory')) as string).toBeTruthy();
      });
      unmount();

      // Now revoke the perk and reopen: the saved amount must not be visible.
      useSettingsStore.setState({ unlockedItems: [] } as never);
      const { container: c2 } = renderScreen();
      await waitFor(() => expect(screenText(c2)).toContain(LABEL.cash));
      fireEvent.click(tabButton(c2, 'السجل') as Element);

      // The saved amount must not be readable without the perk.
      await waitFor(() => {
        expect(screenText(c2)).not.toContain('التفاصيل');
      });
      expect(digitsOf(screenText(c2))).not.toContain('1300');
    });

    it('opens the gold calculator from the gold row', async () => {
      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.cash));

      const goldRow = Array.from(container.querySelectorAll('div')).filter((d) =>
        clean(d.textContent).includes('الذهب والمجوهرات')
      );
      expect(goldRow.length).toBeGreaterThan(0);
      fireEvent.click(goldRow[goldRow.length - 1]);

      // The modal is a separate component; it must actually appear.
      await waitFor(() => {
        expect(
          Array.from(container.querySelectorAll('button')).some((b) =>
            clean(b.textContent).includes('إلغاء')
          )
        ).toBe(true);
      });
    });

    it('shows the 24k-equivalent weight chip computed by the parent', async () => {
      // Seed smart mode with 100g at 21k -> 87.5g equivalent, a figure that
      // appears nowhere else on the screen.
      await DB.setSetting('zakatGoldCalcType', 'smart');
      await DB.setSetting(
        'zakatGoldItems',
        JSON.stringify([{ id: 'g1', label: 'سوار', weight: '100', caliber: 21 }])
      );

      const { container } = renderScreen();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.cash));

      await waitFor(() => {
        expect(screenText(container)).toContain('87.5');
      });
    });
  });
});
