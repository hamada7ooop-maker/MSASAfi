import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Settings } from '@/features/settings/components/Settings';
import { db as DB } from '@/core/db/core';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Characterization tests for the settings screen (669 lines).
 *
 * Written BEFORE any extraction. The substance of this screen is its search
 * index: twelve section descriptors, each carrying translation keys and
 * keywords, filtered against a query in the current language, English, Arabic
 * and the keyword list. The assertions therefore drive the search box and
 * check which sections survive, because "the index got detached from the
 * filter" is the failure an extraction causes here.
 *
 * The tab split is the second behaviour worth pinning: sections are shown by
 * `tab` when not searching, and across both tabs when searching.
 */

const clean = (s: string | null | undefined) => (s || '').replace(/\s+/g, ' ').trim();
const screenText = (c: HTMLElement) => clean(c.textContent);

const LABEL = {
  title: 'الإعدادات',
  searchPlaceholder: 'ابحث عن الإعدادات والميزات الذكية...',
  tabBasic: 'الأساسية',
  tabAdvanced: 'المتقدمة',
  general: 'إعدادات أساسية',
  appLock: 'قفل التطبيق',
  cards: 'البطاقات البنكية',
  // Rendered content, used to prove sections are actually MOUNTED rather than
  // merely absent. Every "not.toContain" assertion is satisfied by an empty
  // page, so each one is now paired with a positive check.
  language: 'اللغة',
  currency: 'العملة الأساسية',
  numbersSection: 'تنسيقات الأرقام والعملات',
  connectivity: 'الربط البنكي المباشر',
  backupSection: 'التخزين والنسخ الاحتياطي',
  apiSection: 'مفاتيح الربط البرمجي (APIs)',
} as const;

const renderScreen = () =>
  render(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>
  );

const searchBox = (c: HTMLElement): HTMLInputElement => {
  const el = c.querySelector(
    `input[placeholder="${LABEL.searchPlaceholder}"]`
  ) as HTMLInputElement | null;
  if (!el) throw new Error('search box not rendered');
  return el;
};

const allButtons = (c: HTMLElement) => Array.from(c.querySelectorAll('button'));

const tabButton = (c: HTMLElement, label: string): Element => {
  const b = allButtons(c).find((x) => clean(x.textContent).includes(label));
  if (!b) throw new Error(`No tab button for ${label}`);
  return b;
};

const search = (c: HTMLElement, q: string) =>
  fireEvent.change(searchBox(c), { target: { value: q } });

/** Waits for the settings cards to finish their initial load. */
const ready = async (c: HTMLElement) =>
  waitFor(() => {
    expect(screenText(c)).toContain(LABEL.title);
    expect(c.querySelector(`input[placeholder="${LABEL.searchPlaceholder}"]`)).toBeTruthy();
  });

async function seed() {
  await DB.transaction('rw', DB.tables, async () => {
    for (const t of DB.tables) await t.clear();
  });
  await new Promise((r) => setTimeout(r, 0));
}

describe('Settings — characterization', () => {
  beforeEach(seed);

  describe('Tabs', () => {
    it('starts on the basic tab and shows its sections', async () => {
      const { container } = renderScreen();
      await ready(container);

      // General belongs to the basic tab, and its card content must render --
      // not just its section heading.
      await waitFor(() => {
        expect(screenText(container)).toContain(LABEL.general);
      });
      expect(screenText(container)).toContain(LABEL.language);
      expect(screenText(container)).toContain(LABEL.currency);
    });

    it('switches to the advanced tab and swaps the visible sections', async () => {
      const { container } = renderScreen();
      await ready(container);
      await waitFor(() => expect(screenText(container)).toContain(LABEL.general));

      fireEvent.click(tabButton(container, LABEL.tabAdvanced));

      // The basic-tab sections must go; asserting only that something appeared
      // would pass even if the tab filter were ignored entirely.
      await waitFor(() => {
        expect(screenText(container)).not.toContain(LABEL.general);
      });
      // ...and the advanced tab is genuinely populated, not blank.
      expect(screenText(container)).toContain(LABEL.connectivity);

      fireEvent.click(tabButton(container, LABEL.tabBasic));
      await waitFor(() => {
        expect(screenText(container)).toContain(LABEL.general);
      });
      expect(screenText(container)).toContain(LABEL.language);
    });
  });

  /**
   * Wiring between the page and the extracted section index.
   *
   * Mutation testing showed the search tests above were blind to every one of
   * these: the index builder takes seven context values, and passing a stub
   * for any of them left all nine assertions green. A settings screen whose
   * cards render but cannot read or write a setting is exactly what an
   * extraction breaks.
   */
  describe('Prop wiring into the section index', () => {
    it('feeds persisted settings into the rendered cards', async () => {
      // The language select reflects `settings.language`, which arrives
      // through the context object. An emptied `settings` falls back to 'ar'.
      await DB.setSetting('language', 'en');

      const { container } = renderScreen();
      await ready(container);
      await waitFor(() => expect(screenText(container)).toContain(LABEL.general));

      await waitFor(() => {
        const selects = Array.from(
          container.querySelectorAll('select')
        ) as HTMLSelectElement[];
        expect(selects.some((sel) => sel.value === 'en')).toBe(true);
      });
    });

    it('persists a change made in a card through updateSetting', async () => {
      const { container } = renderScreen();
      await ready(container);
      await waitFor(() => expect(screenText(container)).toContain(LABEL.currency));

      // The currency select is the one whose options are currency codes.
      const currencySelect = (
        Array.from(container.querySelectorAll('select')) as HTMLSelectElement[]
      ).find((sel) =>
        Array.from(sel.options).some((o) => o.value === 'AED')
      );
      expect(currencySelect).toBeTruthy();
      fireEvent.change(currencySelect as HTMLSelectElement, { target: { value: 'AED' } });

      // A stubbed updateSetting writes nothing, so the round trip to storage
      // is what proves the callback reached the page.
      await waitFor(async () => {
        expect(await DB.getSetting('baseCurrency')).toBe('AED');
      });
    });

    it('opens the bank selector from the connectivity section', async () => {
      const { container } = renderScreen();
      await ready(container);
      fireEvent.click(tabButton(container, LABEL.tabAdvanced));
      await waitFor(() => expect(screenText(container)).toContain(LABEL.connectivity));

      const connectBtn = allButtons(container).find(
        (b) => clean(b.textContent) === 'ربط'
      );
      expect(connectBtn).toBeTruthy();
      fireEvent.click(connectBtn as Element);

      // handleBankConnect is page-owned; a stub leaves the modal closed. The
      // sheet opens on its country step, not the bank list.
      await waitFor(() => {
        expect(screenText(container)).toContain('اختر الدولة لتحديد البنوك المرخصة');
      });
    });

    it('opens the mockup notice for a beta section', async () => {
      const { container } = renderScreen();
      await ready(container);
      fireEvent.click(tabButton(container, LABEL.tabAdvanced));
      await waitFor(() => expect(screenText(container)).toContain(LABEL.connectivity));

      const manageBtn = allButtons(container).find(
        (b) => clean(b.textContent) === 'إدارة'
      );
      expect(manageBtn).toBeTruthy();
      fireEvent.click(manageBtn as Element);

      // setMockupModal is page-owned state passed into the index. Asserted on
      // the modal's DESCRIPTION, not the word "Mockup" -- that already appears
      // as a badge on the section itself, so a stubbed callback passed.
      await waitFor(() => {
        expect(screenText(container)).toContain(
          'هذه الميزة حالياً مجرد نموذج (Mockup). نحن نعمل بجد لتفعيل الربط المباشر'
        );
      });
    });

    it('reloads settings after a PIN is set, so the card reflects the new state', async () => {
      const { container } = renderScreen();
      await ready(container);
      // Security lives on the BASIC tab.
      await waitFor(() => expect(screenText(container)).toContain(LABEL.appLock));

      // Set a PIN through the security card. On success it calls
      // refreshSettings(), which is the page's `refresh` threaded through the
      // section context -- a stub leaves the card showing the pre-PIN state.
      const pinField = Array.from(container.querySelectorAll('input')).find(
        (i) => (i as HTMLInputElement).type === 'password'
      ) as HTMLInputElement;
      expect(pinField).toBeTruthy();
      fireEvent.change(pinField, { target: { value: '4321' } });

      const saveBtn = allButtons(container).find(
        (b) => b.getAttribute('title') === 'حفظ' || clean(b.textContent) === 'save'
      );
      expect(saveBtn).toBeTruthy();
      fireEvent.click(saveBtn as Element);

      // The PIN reaches storage...
      await waitFor(async () => {
        expect(await DB.getSetting('pinHash')).toBeTruthy();
      }, { timeout: 8000 });

      // ...and the card re-renders from the refreshed settings, swapping the
      // entry field for the lock/disable controls.
      await waitFor(() => {
        expect(screenText(container)).toContain('قفل الآن');
      }, { timeout: 8000 });
    });

    it('keeps the developer unlock out of the tree outside DEV builds', () => {
      // The M-3 protection: every branch is guarded by import.meta.env.DEV so
      // Vite strips the modal -- and the VITE_MASTER_* literals -- from
      // production bundles. This asserts the guards are still present in
      // source after the extraction, in all three required places.
      const page = readFileSync(
        join(process.cwd(), 'src/features/settings/components/Settings.tsx'),
        'utf8'
      );
      const modal = readFileSync(
        join(process.cwd(), 'src/features/settings/components/DevUnlockModal.tsx'),
        'utf8'
      );
      // 1) the call site is gated,
      expect(page).toContain('import.meta.env.DEV &&');
      // 2) the component refuses to render,
      expect(modal).toContain('if (!import.meta.env.DEV || !open) return null;');
      // 3) and the handler returns early.
      expect(modal).toContain('if (!import.meta.env.DEV) return;');
    });

    it('does not show the developer modal until it is asked for', async () => {
      // `open` must be driven by the page's tap counter. Hard-wiring it true
      // puts a master-password prompt in front of every user in a dev build.
      const { container } = renderScreen();
      await ready(container);
      await waitFor(() => expect(screenText(container)).toContain(LABEL.general));

      // Identified by the dev modal's own placeholder: the security card also
      // renders a password input (the app PIN), so a bare type check is true
      // regardless and proves nothing.
      expect(
        container.querySelector('input[placeholder="Master passcode..."]')
      ).toBeNull();
    });
  });

  describe('Search index', () => {
    it('filters sections by an English keyword', async () => {
      const { container } = renderScreen();
      await ready(container);
      await waitFor(() => expect(screenText(container)).toContain(LABEL.general));

      // "backup" is a keyword on the backupSync section, which lives on the
      // ADVANCED tab -- so a hit here also proves search crosses tabs.
      search(container, 'backup');

      await waitFor(() => {
        expect(screenText(container)).not.toContain(LABEL.general);
      });
      // The backup section itself must be on screen -- an empty result set
      // also satisfies the assertion above.
      expect(screenText(container)).toContain(LABEL.backupSection);
    });

    it('filters by an Arabic keyword too', async () => {
      const { container } = renderScreen();
      await ready(container);
      await waitFor(() => expect(screenText(container)).toContain(LABEL.general));

      // 'لغة' is a keyword on the general section.
      search(container, 'لغة');

      await waitFor(() => {
        expect(screenText(container)).toContain(LABEL.general);
      });
      expect(screenText(container)).toContain(LABEL.language);
      // ...and unrelated sections are filtered out.
      expect(screenText(container)).not.toContain(LABEL.apiSection);
    });

    it('searches across BOTH tabs, not just the active one', async () => {
      const { container } = renderScreen();
      await ready(container);
      await waitFor(() => expect(screenText(container)).toContain(LABEL.general));

      // Still on the basic tab, but 'gemini' only matches an advanced section.
      // Finding it proves the tab filter is bypassed while searching.
      search(container, 'gemini');

      await waitFor(() => {
        expect(screenText(container)).not.toContain(LABEL.general);
      });
      // An advanced-tab section is present while the basic tab is active.
      expect(screenText(container)).toContain(LABEL.apiSection);
    });

    it('shows nothing from the index for a query that matches no section', async () => {
      const { container } = renderScreen();
      await ready(container);
      await waitFor(() => expect(screenText(container)).toContain(LABEL.general));

      search(container, 'zzzznotarealsetting');

      await waitFor(() => {
        expect(screenText(container)).not.toContain(LABEL.general);
      });
      expect(screenText(container)).not.toContain(LABEL.apiSection);
      expect(screenText(container)).not.toContain(LABEL.backupSection);
    });

    it('restores the tab view when the query is cleared', async () => {
      const { container } = renderScreen();
      await ready(container);
      await waitFor(() => expect(screenText(container)).toContain(LABEL.general));

      search(container, 'gemini');
      await waitFor(() => expect(screenText(container)).not.toContain(LABEL.general));

      search(container, '');
      await waitFor(() => {
        expect(screenText(container)).toContain(LABEL.general);
      });
      expect(screenText(container)).toContain(LABEL.numbersSection);
    });

    it('matches a section by a KEYWORD that appears in no translation', async () => {
      const { container } = renderScreen();
      await ready(container);
      await waitFor(() => expect(screenText(container)).toContain(LABEL.general));

      // 'فيزا' is a keyword on the cards section and appears in no
      // translation key. Every other search term in this file ('backup',
      // 'gemini', 'لغة') also matches a label, so dropping keyword matching
      // entirely survived them all -- this is the only query that isolates it.
      search(container, 'فيزا');

      await waitFor(() => {
        expect(screenText(container)).toContain(LABEL.cards);
      });
      expect(screenText(container)).not.toContain(LABEL.general);
    });

    it('matches a section by its translated label, not only by keywords', async () => {
      const { container } = renderScreen();
      await ready(container);
      await waitFor(() => expect(screenText(container)).toContain(LABEL.general));

      // 'قفل التطبيق' is the VALUE of settings.appLock, which the security
      // section lists in `keys` -- it is not in any keyword array. This pins
      // the translation-key half of the filter specifically.
      search(container, 'قفل التطبيق');

      await waitFor(() => {
        expect(screenText(container)).toContain(LABEL.appLock);
      });
      expect(screenText(container)).not.toContain(LABEL.general);
    });
  });
});
