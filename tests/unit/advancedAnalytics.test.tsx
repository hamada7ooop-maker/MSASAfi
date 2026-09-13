import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdvancedAnalytics } from '@/features/reports/components/AdvancedAnalytics';
import { db } from '@/core/db/core';

/**
 * Characterization tests for the Advanced Analytics screen.
 *
 * At 1223 lines this is the second-largest file in the app, and like
 * AddTransactionPage it had no render-level coverage: only its extracted
 * maths helpers (analyticsMath / colorUtils) were tested, never the component
 * that wires them to the four tabs.
 *
 * These tests seed real transactions so the assertions are about *computed
 * output* — the numbers a user actually reads — rather than the presence of
 * empty containers. That is what makes them able to detect a broken
 * extraction: a tab that renders but no longer receives its data will fail
 * here, whereas a smoke test would stay green.
 */

const clean = (s: string | null | undefined) => (s || '').replace(/\s+/g, ' ').trim();

const TAB = {
  analysis: 'تحليل المصروفات',
  heatmap: 'خريطة حرارية',
  freedom: 'مؤشر الحرية',
  comparison: 'مقارنة الفترات 📊',
} as const;

const renderPage = () =>
  render(
    <MemoryRouter>
      <AdvancedAnalytics />
    </MemoryRouter>
  );

const clickTab = (container: HTMLElement, label: string) => {
  const btn = Array.from(container.querySelectorAll('button')).find(
    (b) => clean(b.textContent) === label
  );
  expect(btn, `tab not found: ${label}`).toBeTruthy();
  fireEvent.click(btn!);
};

/** An ISO date inside the current month, safe for any day-of-month. */
const thisMonth = (day: number) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), day, 12, 0, 0).toISOString();
};

async function seed() {
  await db.transactions.clear();
  await db.accounts.clear();

  await db.accounts.bulkAdd([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { id: 'acc-1', name: 'Main', balance: 10000, type: 'cash' } as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { id: 'acc-2', name: 'Savings', balance: 5000, type: 'bank' } as any,
  ]);

  await db.transactions.bulkAdd([
    // Needs: category names must contain a known "needs" keyword.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { id: 't1', type: 'expense', amount: 300, category: 'مواد غذائية', date: thisMonth(3), accountId: 'acc-1' } as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { id: 't2', type: 'expense', amount: 700, category: 'سكن', date: thisMonth(4), accountId: 'acc-1' } as any,
    // Wants
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { id: 't3', type: 'expense', amount: 1000, category: 'ترفيه', date: thisMonth(5), accountId: 'acc-1', mood: 'stressed' } as any,
    // Income
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { id: 't4', type: 'income', amount: 4000, category: 'راتب', date: thisMonth(2), accountId: 'acc-1' } as any,
    // Excluded from analytics: a draft and a soft-deleted row.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { id: 't5', type: 'expense', amount: 9999, category: 'ترفيه', date: thisMonth(6), isDraft: true } as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { id: 't6', type: 'expense', amount: 8888, category: 'ترفيه', date: thisMonth(7), isDeleted: true } as any,
  ]);
}

describe('Advanced Analytics — shell', () => {
  beforeEach(seed);

  it('renders the four tabs and defaults to expense analysis', async () => {
    const { container } = renderPage();
    await waitFor(() => {
      const labels = Array.from(container.querySelectorAll('button')).map((b) => clean(b.textContent));
      for (const t of Object.values(TAB)) expect(labels).toContain(t);
    });
    // Analysis content is the default view.
    await waitFor(() => {
      expect(clean(container.textContent)).toContain('الضروريات مقابل الرغبات');
    });
  });

  it('keeps the export actions available', async () => {
    const { container } = renderPage();
    await waitFor(() => {
      const labels = Array.from(container.querySelectorAll('button')).map((b) => clean(b.textContent));
      expect(labels).toContain('print');
      expect(labels).toContain('picture_as_pdf');
    });
  });
});

describe('Advanced Analytics — analysis tab computes from real data', () => {
  beforeEach(seed);

  it('splits needs vs wants from the seeded expenses', async () => {
    const { container } = renderPage();
    // needs = 300 (food) + 700 (housing) = 1000; wants = 1000 (leisure) -> 50/50.
    // Assert on the LABELLED figures: a bare "1,000.00" also appears in the
    // mood card, so matching the raw number would not prove this card got its
    // data. The label+value pair is unique to needs/wants.
    await waitFor(() => {
      expect(clean(container.textContent)).toContain('الضروريات: 1,000.00');
    });
    const txt = clean(container.textContent);
    expect(txt).toContain('الكماليات: 1,000.00');
    // And the percentage split rendered by the bar.
    expect(txt).toContain('50%');
    // Drafts/deleted must never reach the figures.
    expect(txt).not.toContain('9,999');
    expect(txt).not.toContain('8,888');
  });

  it('shows the mood breakdown including the stressed spend', async () => {
    const { container } = renderPage();
    await waitFor(() => {
      expect(clean(container.textContent)).toContain('تحليل الإنفاق العاطفي والمزاجي');
    });
    expect(clean(container.textContent)).toContain('متوتر');
  });

  it('renders the day-of-week breakdown with real per-day amounts', async () => {
    const { container } = renderPage();
    // Wait for DATA, not just the heading: headings render before the Dexie
    // query resolves, so waiting on one races the numbers and reads all zeros.
    await waitFor(() => {
      expect(clean(container.textContent)).toContain('الضروريات: 1,000.00');
    });
    expect(clean(container.textContent)).toContain('المصروفات حسب أيام الأسبوع');

    // The three seeded expenses fall on three distinct weekdays, so each bar
    // must show its own amount. Asserting only on the heading would let a
    // disconnected dayOfWeekSpending prop pass unnoticed.
    const weekdaySection = Array.from(container.querySelectorAll('div')).filter((d) =>
      clean(d.textContent).startsWith('calendar_view_week')
    ).pop()!;
    const txt = clean(weekdaySection.textContent);
    for (const a of ['300.00', '700.00', '1,000.00']) expect(txt).toContain(a);
  });
});

describe('Advanced Analytics — other tabs render their own content', () => {
  beforeEach(seed);

  it('heatmap tab shows the calendar', async () => {
    const { container } = renderPage();
    await waitFor(() => expect(clean(container.textContent)).toContain('الضروريات مقابل الرغبات'));
    clickTab(container, TAB.heatmap);
    await waitFor(() => {
      expect(clean(container.textContent)).toContain('تقويم خريطة الإنفاق الحرارية');
    });
    // Switching tabs replaces the analysis content.
    expect(clean(container.textContent)).not.toContain('الضروريات مقابل الرغبات');

    // Day cells carry their spend (rounded, no separators): 300 / 700 / 1000
    // on days 3, 4 and 5 of the current month. This proves heatmapData is
    // actually wired through, which a heading-only check cannot.
    const dayButtons = Array.from(container.querySelectorAll('button')).map((b) =>
      clean(b.textContent)
    );
    expect(dayButtons).toContain('3300');
    expect(dayButtons).toContain('4700');
    expect(dayButtons).toContain('51000');
  });

  it('freedom tab reports wealth from the seeded accounts', async () => {
    const { container } = renderPage();
    await waitFor(() => expect(clean(container.textContent)).toContain('الضروريات مقابل الرغبات'));
    clickTab(container, TAB.freedom);
    await waitFor(() => {
      expect(clean(container.textContent)).toContain('مؤشر الحرية المالية');
    });
    // Every figure on this tab is derived, so pin the derivation end-to-end:
    //   wealth   = 10000 + 5000            = 15,000
    //   baseline = this month's expenses   = 2,000  (300 + 700 + 1000)
    //   required = 2000 * 12 / 0.04        = 600,000   (the 4% rule)
    //   score    = 15000 / 600000 * 100    = 2.5%
    //   months   = 15000 / 2000            = 7.5
    // Checking only the wealth total would leave score and months unguarded.
    const txt = clean(container.textContent);
    expect(txt).toContain('15,000.00');
    expect(txt).toContain('600,000.00');
    expect(txt).toContain('2.5%');
    expect(txt).toContain('7.5');
    expect(txt).toContain('أشهر الأمان المالي');
  });

  it('comparison tab exposes both period pickers and the income total', async () => {
    const { container } = renderPage();
    await waitFor(() => expect(clean(container.textContent)).toContain('الضروريات مقابل الرغبات'));
    clickTab(container, TAB.comparison);
    await waitFor(() => {
      expect(clean(container.textContent)).toContain('الفترة الزمنية الأولى');
    });
    const txt = clean(container.textContent);
    expect(txt).toContain('الفترة الزمنية الثانية');
    expect(txt).toContain('إجمالي الدخل');
    expect(txt).toContain('إجمالي المصاريف');
    // Period A defaults to this month: income 4000, expenses 2000, net 2000.
    // Period B is the previous month and is empty.
    expect(txt).toContain('4,000.00');
    expect(txt).toContain('2,000.00');
    // The per-category deltas are computed from period A vs B.
    expect(txt).toContain('+1,000.00');
    expect(txt).toContain('+700.00');
    expect(txt).toContain('+300.00');
    expect(container.querySelectorAll('input[type="date"]').length).toBe(4);
  });

  it('can return to the analysis tab', async () => {
    const { container } = renderPage();
    await waitFor(() => expect(clean(container.textContent)).toContain('الضروريات مقابل الرغبات'));
    clickTab(container, TAB.freedom);
    await waitFor(() => expect(clean(container.textContent)).toContain('مؤشر الحرية المالية'));
    clickTab(container, TAB.analysis);
    await waitFor(() => {
      expect(clean(container.textContent)).toContain('الضروريات مقابل الرغبات');
    });
  });
});

describe('Advanced Analytics — comparison period inputs drive the figures', () => {
  beforeEach(seed);

  it('recomputes when a period-A date is narrowed past the income', async () => {
    const { container } = renderPage();
    await waitFor(() => expect(clean(container.textContent)).toContain('الضروريات مقابل الرغبات'));
    clickTab(container, TAB.comparison);
    await waitFor(() => expect(clean(container.textContent)).toContain('4,000.00'));

    const dates = Array.from(container.querySelectorAll('input[type="date"]')) as HTMLInputElement[];
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    // Move period A to start after the income transaction (day 2).
    const startAfter = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(20)}`;
    fireEvent.change(dates[0], { target: { value: startAfter } });

    await waitFor(() => {
      const periodA = within(container).queryAllByText(/4,000\.00/);
      expect(periodA.length).toBe(0);
    });
  });
});
