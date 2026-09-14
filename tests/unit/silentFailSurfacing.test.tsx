import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor, renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db as DB } from '@/core/db/core';
import { CardRepository } from '@/core/db/repositories/cards';
import { SettingsService } from '@/core/services/SettingsService';
import { useSettings } from '@/features/settings/hooks/useSettings';
import { useAppStore } from '@/store/appStore';
import { BackupSyncCard } from '@/features/settings/components/cards/BackupSyncCard';
import { BankCardsManager } from '@/features/cards/components/BankCardsManager';
import { AddCardModal } from '@/features/cards/components/AddCardModal';
import { ReportBuilderModal } from '@/features/reports/components/ReportBuilderModal';
import { TravelBudget } from '@/features/budgets/components/TravelBudget';
import type { BankCard, Trip } from '@/types';

/**
 * Directive 15 (Option A) — silentFail & swallowed-exception audit.
 *
 * Characterization tests for the sites the audit reclassified from "swallow"
 * to "surface": each test forces the underlying write to fail and asserts the
 * user actually sees an error toast. Before this directive every one of these
 * paths failed invisibly — the delete "worked", the restore "finished", the
 * toggle "stuck" — and the only trace was a Crashlytics record in a build
 * where Crashlytics is not yet active, i.e. nothing at all.
 *
 * They are deliberately UI-level (rendered component + toast DOM) rather than
 * hook-level spies, because the property being pinned is "the user is told",
 * not "a function was called".
 *
 * The file mocks restoreBackup at module level because BackupSyncCard imports
 * it by name; a partial factory keeps every other export (exportEncrypted,
 * cloudSignIn, getCloudSession, …) real.
 */
vi.mock('@/features/settings/services/settingsService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/settings/services/settingsService')>();
  return {
    ...actual,
    restoreBackup: vi.fn(async (_file: File) => {
      throw new Error('not configured');
    }),
  };
});

const clean = (s: string | null | undefined) => (s || '').replace(/\s+/g, ' ').trim();

/** Error toasts are `.masarifi-toast` with role=alert (set only for 'error'). */
const errorToastTexts = (): string[] =>
  Array.from(document.querySelectorAll('.masarifi-toast[role="alert"]')).map((el) =>
    clean(el.textContent)
  );

/** Toasts and bottom sheets attach to <body>, outside RTL's cleanup reach. */
const sweepFloatingUi = () => {
  document
    .querySelectorAll('.masarifi-toast, .bottom-sheet-overlay')
    .forEach((el) => el.remove());
};

async function wipe() {
  await DB.transaction('rw', DB.tables, async () => {
    for (const t of DB.tables) await t.clear();
  });
  await new Promise((r) => setTimeout(r, 0));
}

/** Clicks the confirm button of a confirmSheet by its label. */
const confirmSheetByLabel = (label: string) => {
  const btn = Array.from(document.querySelectorAll('.bottom-sheet-overlay button')).find(
    (b) => clean(b.textContent) === label
  );
  if (!btn) throw new Error(`confirmSheet button "${label}" not found`);
  fireEvent.click(btn);
};

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

const makeTrip = (over: Partial<Trip> & { id: string }): Trip => ({
  name: 'رحلة اختبار',
  currency: 'USD',
  limit: 1000,
  exchangeRate: 3.75,
  startDate: '2026-09-01',
  endDate: '2026-09-10',
  isActive: true,
  ...over,
});

describe('Directive 15 — critical failures must surface to the user', () => {
  beforeEach(async () => {
    await wipe();
    sweepFloatingUi();
    vi.restoreAllMocks();
    useAppStore.getState().setReportBuilderOpen(false);
  });

  describe('BackupSyncCard — restore failure', () => {
    it('shows an error toast when restoreBackup rejects (was: fully silent)', async () => {
      const { restoreBackup } = await import(
        '@/features/settings/services/settingsService'
      );
      vi.mocked(restoreBackup).mockRejectedValueOnce(new Error('File reading failed'));

      render(
        <MemoryRouter>
          <BackupSyncCard />
        </MemoryRouter>
      );

      // The file input only exists inside the collapsed "local backup"
      // section — expand it first (ar: settings.localBackup).
      const sectionBtn = await waitFor(() => {
        const btn = Array.from(document.querySelectorAll('button')).find((b) =>
          clean(b.textContent).includes('نسخة محلية')
        );
        expect(btn).toBeDefined();
        return btn as HTMLElement;
      });
      fireEvent.click(sectionBtn);

      const input = await waitFor(() => {
        const el = document.querySelector('input[type="file"]') as HTMLInputElement;
        expect(el).not.toBeNull();
        return el;
      });

      const file = new File(['{"transactions":[]}'], 'backup.enc', {
        type: 'application/json',
      });
      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(errorToastTexts().length).toBeGreaterThan(0);
      });
      // ar: settings.msg.restoreFailed
      expect(errorToastTexts().join(' ')).toContain('فشل استعادة النسخة الاحتياطية');
    });
  });

  describe('BankCardsManager — card delete failure', () => {
    it('shows an error toast when CardRepository.delete rejects (was: silent, card looked undeleted)', async () => {
      await DB.cards.add(makeCard({ id: 'card_del_fail' }));
      vi.spyOn(CardRepository, 'delete').mockRejectedValueOnce(
        new Error('IndexedDB write failed')
      );

      render(
        <MemoryRouter>
          <BankCardsManager />
        </MemoryRouter>
      );

      // Wait for the deck to load, then open the delete confirm sheet.
      await waitFor(() => {
        expect(document.querySelector('button[title="حذف البطاقة"]')).not.toBeNull();
      });
      fireEvent.click(document.querySelector('button[title="حذف البطاقة"]') as Element);

      // Confirm inside the bottom sheet (ar: deleteBtn = "حذف").
      await waitFor(() => {
        expect(document.querySelector('.bottom-sheet-overlay')).not.toBeNull();
      });
      await act(async () => {
        confirmSheetByLabel('حذف');
      });

      await waitFor(() => {
        expect(errorToastTexts().length).toBeGreaterThan(0);
      });
      // ar LOCAL_TEXTS.deleteFailed
      expect(errorToastTexts().join(' ')).toContain('فشل حذف البطاقة');
      // The toast must be an error, not a success "deleted" toast.
      expect(errorToastTexts().join(' ')).not.toContain('تم حذف البطاقة بنجاح');
    });
  });

  describe('AddCardModal — card save failure', () => {
    it('reports a save failure instead of the misleading "fill all fields" message', async () => {
      vi.spyOn(CardRepository, 'add').mockRejectedValueOnce(new Error('quota exceeded'));

      const { container } = render(
        <MemoryRouter>
          <AddCardModal open editingCard={null} onClose={vi.fn()} onSaved={vi.fn()} />
        </MemoryRouter>
      );

      // A fully valid form — the failure is the DB write, not validation.
      const set = (placeholder: string, value: string) => {
        const el = container.querySelector(
          `input[placeholder="${placeholder}"]`
        ) as HTMLInputElement;
        if (!el) throw new Error(`field ${placeholder} not found`);
        fireEvent.change(el, { target: { value } });
      };
      set('0000 0000 0000 0000', '5555 5555 5555 9911');
      set('EX. MOHAMMED AL-RASHID', 'NEW HOLDER');
      set('MM/YY', '09/30');
      set('•••', '123');

      const saveBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => clean(b.textContent) === 'حفظ البطاقة'
      ) as HTMLElement;
      expect(saveBtn).toBeDefined();
      await act(async () => {
        fireEvent.click(saveBtn);
      });

      await waitFor(() => {
        expect(errorToastTexts().length).toBeGreaterThan(0);
      });
      const seen = errorToastTexts().join(' ');
      // ar LOCAL_TEXTS.saveFailed — the honest message.
      expect(seen).toContain('حدث خطأ أثناء حفظ البطاقة');
      // ...and not the old validation message for a form that was complete.
      expect(seen).not.toContain('يرجى ملء جميع الحقول المطلوبة');
      // The modal stays open so the user does not lose the entered card.
      expect(container.querySelector('input')).not.toBeNull();
    });
  });

  describe('useSettings — failed setting persistence', () => {
    it('rolls the optimistic update back and toasts when the DB write fails (was: toggle stuck on)', async () => {
      // Seed a persisted value so the rollback assertion is meaningful —
      // SettingsRepository.getAll() returns only stored rows, no defaults.
      await DB.settings.add({ id: 'baseCurrency', value: 'SAR' });

      const { result } = renderHook(() => useSettings());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const before = result.current.settings.baseCurrency;
      expect(before).toBe('SAR');

      vi.spyOn(SettingsService, 'updateSetting').mockRejectedValueOnce(
        new Error('IndexedDB quota')
      );

      await act(async () => {
        await result.current.updateSetting('baseCurrency', 'USD');
      });

      // The optimistic 'USD' must be rolled back to the persisted value.
      expect(result.current.settings.baseCurrency).toBe(before);
      expect(result.current.settings.baseCurrency).not.toBe('USD');

      // ar: common.error
      await waitFor(() => {
        expect(errorToastTexts().length).toBeGreaterThan(0);
      });
    });
  });

  describe('ReportBuilderModal — export failure', () => {
    it('shows an error toast and stays open when ExportService rejects (was: spinner just stopped)', async () => {
      const { ExportService } = await import('@/features/reports/services/exportService');
      vi.spyOn(ExportService, 'exportData').mockRejectedValueOnce(
        new Error('pdf worker crashed')
      );

      useAppStore.getState().setReportBuilderOpen(true);
      const { container } = render(
        <MemoryRouter>
          <ReportBuilderModal />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(clean(container.textContent)).toContain('توليد التقرير');
      });
      // The button carries a material icon span, so match by contained text.
      const generate = Array.from(container.querySelectorAll('button')).find((b) =>
        clean(b.textContent).includes('توليد التقرير')
      ) as HTMLElement;
      expect(generate).toBeDefined();

      await act(async () => {
        fireEvent.click(generate);
      });

      await waitFor(() => {
        expect(errorToastTexts().length).toBeGreaterThan(0);
      });
      // ar: report.exportFail
      expect(errorToastTexts().join(' ')).toContain('فشل التصدير');
      // Failure must not close the modal — only success does that.
      expect(useAppStore.getState().isReportBuilderOpen).toBe(true);
    });
  });

  describe('TravelBudget — trip delete failure', () => {
    it('shows an error toast when the trip delete rejects (was: silent, success toast implied it worked)', async () => {
      await DB.trips.add(makeTrip({ id: 'trip_del_fail' }));
      vi.spyOn(DB.trips, 'delete').mockRejectedValueOnce(new Error('db locked'));

      render(
        <MemoryRouter>
          <TravelBudget />
        </MemoryRouter>
      );

      // The delete button only exists in the trip's expanded detail section —
      // select the trip card first by clicking its name.
      const tripCard = await waitFor(() => {
        const el = Array.from(document.querySelectorAll('.fin-card')).find((c) =>
          clean(c.textContent).includes('رحلة اختبار')
        );
        expect(el).toBeDefined();
        return el as HTMLElement;
      });
      await act(async () => {
        fireEvent.click(tripCard);
      });

      // The per-trip delete button carries title={t('action.delete')} = "حذف".
      await waitFor(() => {
        expect(document.querySelector('button[title="حذف"]')).not.toBeNull();
      });
      fireEvent.click(document.querySelector('button[title="حذف"]') as Element);

      await waitFor(() => {
        expect(document.querySelector('.bottom-sheet-overlay')).not.toBeNull();
      });
      await act(async () => {
        confirmSheetByLabel('حذف');
      });

      await waitFor(() => {
        expect(errorToastTexts().length).toBeGreaterThan(0);
      });
      // ar: travel.errDelete
      expect(errorToastTexts().join(' ')).toContain('حدث خطأ أثناء حذف الرحلة');
      expect(errorToastTexts().join(' ')).not.toContain('تم الحذف بنجاح');
    });
  });
});
