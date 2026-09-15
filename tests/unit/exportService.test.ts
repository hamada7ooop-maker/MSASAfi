import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExportService } from '../../src/features/reports/services/exportService';
import { toast, confirmSheet } from '../../src/toast';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { db as DB } from '../../src/core/db/core';

vi.mock('../../src/toast', () => ({
  toast: vi.fn(),
  confirmSheet: vi.fn(),
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn().mockReturnValue(false) },
}));
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: { writeFile: vi.fn() },
  Directory: { Documents: 'DOCUMENTS', Cache: 'CACHE' },
  Encoding: { UTF8: 'utf8' },
}));
vi.mock('@capacitor/share', () => ({ Share: { share: vi.fn() } }));
vi.mock('../../src/services/xlsxWriter', () => ({
  aoa_to_xlsx_base64: vi.fn().mockReturnValue('xlsx-base64-payload'),
  aoa_to_xlsx_download: vi.fn(),
}));
vi.mock('../../src/services/pdfExport', () => ({
  exportProfessionalPDF: vi.fn().mockResolvedValue(undefined),
  exportTaxPDF: vi.fn().mockResolvedValue(undefined),
}));

const mockToast = vi.mocked(toast);
const mockConfirmSheet = vi.mocked(confirmSheet);

interface TxnOverrides {
  id: string;
  date?: string;
  type?: 'income' | 'expense';
  amount?: number;
  category?: string;
  description?: string;
  isDeleted?: boolean;
  isDraft?: boolean;
  shared?: boolean;
  splitBy?: number;
  createdAt?: number;
}

async function seedTxns(txns: TxnOverrides[]) {
  await DB.transactions.bulkPut(
    txns.map((t) => ({
      description: 'tx',
      amount: 10,
      type: 'expense',
      accountId: 'a1',
      category: 'other',
      date: '2026-09-01',
      createdAt: Date.now(),
      ...t,
    }))
  );
}

describe('ExportService Unit Tests (exportService.ts)', () => {
  let clickedAnchors: HTMLAnchorElement[];

  beforeEach(async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    mockToast.mockClear();
    mockConfirmSheet.mockClear();
    vi.mocked(Filesystem.writeFile).mockReset();
    for (const table of DB.tables) await table.clear();
    clickedAnchors = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      clickedAnchors.push(this);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('exportData — filtering & running balance', () => {
    it('exports only live (non-deleted, non-draft) transactions as JSON with running balances', async () => {
      await seedTxns([
        { id: 't1', date: '2026-01-01', type: 'income', amount: 1000 },
        { id: 't2', date: '2026-01-02', type: 'expense', amount: 300 },
        { id: 't3', date: '2026-01-03', type: 'expense', amount: 200, isDeleted: true },
        { id: 't4', date: '2026-01-04', type: 'income', amount: 50, isDraft: true },
      ]);

      await ExportService.exportData('json');

      const file = vi.mocked(Filesystem.writeFile);
      expect(file).not.toHaveBeenCalled(); // web path downloads via anchor
      expect(clickedAnchors).toHaveLength(1);
      expect(clickedAnchors[0].download).toMatch(/^masarifi_\d{4}-\d{2}-\d{2}\.json$/);

      const href = clickedAnchors[0].href;
      const payload = JSON.parse(atob(href.split('base64,')[1])) as Array<{
        id: string;
        runningBalance?: number;
      }>;
      expect(payload.map((p) => p.id)).toEqual(['t2', 't1']); // newest first
      const byId = Object.fromEntries(payload.map((p) => [p.id, p.runningBalance]));
      expect(byId['t1']).toBe(1000);
      expect(byId['t2']).toBe(700);
    });

    it('splits shared expenses by splitBy when computing the running balance', async () => {
      await seedTxns([
        { id: 't1', date: '2026-01-01', type: 'income', amount: 400 },
        { id: 't2', date: '2026-01-02', type: 'expense', amount: 100, shared: true, splitBy: 4 },
      ]);
      await ExportService.exportData('json');
      const href = clickedAnchors[0].href;
      const payload = JSON.parse(atob(href.split('base64,')[1])) as Array<{
        id: string;
        runningBalance?: number;
      }>;
      const byId = Object.fromEntries(payload.map((p) => [p.id, p.runningBalance]));
      expect(byId['t2']).toBe(375); // 400 − 100/4
    });

    it('applies date, type and category filters', async () => {
      await seedTxns([
        { id: 'in-a', date: '2026-01-01', type: 'income', amount: 10, category: 'salary' },
        { id: 'in-b', date: '2026-02-01', type: 'income', amount: 20, category: 'other' },
        { id: 'ex-a', date: '2026-02-05', type: 'expense', amount: 30, category: 'other' },
      ]);
      await ExportService.exportData('json', {
        startDate: '2026-01-15',
        endDate: '2026-02-02',
        type: 'income',
        categories: ['other'],
      });
      const href = clickedAnchors[0].href;
      const payload = JSON.parse(atob(href.split('base64,')[1])) as Array<{ id: string }>;
      expect(payload.map((p) => p.id)).toEqual(['in-b']);
    });

    it('refuses to export when nothing matches (error toast, no download)', async () => {
      await seedTxns([{ id: 't1', date: '2026-01-01', type: 'income', amount: 10 }]);
      await ExportService.exportData('json', { type: 'expense' });
      expect(mockToast).toHaveBeenCalledWith(expect.anything(), 'error');
      expect(clickedAnchors).toHaveLength(0);
    });

    it('builds a CSV with header, translated type labels and quoted descriptions', async () => {
      await seedTxns([
        { id: 't1', date: '2026-01-01', type: 'expense', amount: 25, description: 'قهوة, لاتيه' },
      ]);
      await ExportService.exportData('csv');
      expect(clickedAnchors[0].download).toMatch(/\.csv$/);
      const href = clickedAnchors[0].href;
      const csv = decodeURIComponent(escape(atob(href.split('base64,')[1])));
      expect(csv).toContain('قهوة, لاتيه'); // description quoted, commas preserved
      expect(csv).toMatch(/\n/); // header row + data rows
    });
  });

  describe('exportData — xlsx', () => {
    it('downloads through the xlsx writer on the web', async () => {
      const { aoa_to_xlsx_download } = await import('../../src/services/xlsxWriter');
      await seedTxns([{ id: 't1', date: '2026-01-01', type: 'income', amount: 10 }]);
      await ExportService.exportData('xlsx');
      expect(aoa_to_xlsx_download).toHaveBeenCalledTimes(1);
      const rows = vi.mocked(aoa_to_xlsx_download).mock.calls[0][0] as unknown[][];
      expect(rows).toHaveLength(2); // header + one data row
    });

    it('saves base64 natively on mobile', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      const { aoa_to_xlsx_base64 } = await import('../../src/services/xlsxWriter');
      await seedTxns([{ id: 't1', date: '2026-01-01', type: 'income', amount: 10 }]);
      const writeSpy = vi
        .mocked(Filesystem.writeFile)
        .mockResolvedValue({ uri: 'file://documents/x.xlsx' } as never);

      await ExportService.exportData('xlsx');

      expect(aoa_to_xlsx_base64).toHaveBeenCalled();
      expect(writeSpy).toHaveBeenCalledTimes(1);
      expect(writeSpy.mock.calls[0][0].directory).toBe(Directory.Documents);
      expect(writeSpy.mock.calls[0][0].encoding).toBeUndefined(); // base64 mode
    });
  });

  describe('exportData — pdf & failures', () => {
    it('delegates to the professional PDF exporter', async () => {
      const { exportProfessionalPDF } = await import('../../src/services/pdfExport');
      await seedTxns([{ id: 't1', date: '2026-01-01', type: 'income', amount: 10 }]);
      await ExportService.exportData('pdf');
      expect(exportProfessionalPDF).toHaveBeenCalledTimes(1);
      expect(mockToast).toHaveBeenCalledWith(expect.anything()); // success path
    });

    it('surfaces failures as an error toast (never throws)', async () => {
      vi.spyOn(DB, 'getTransactions').mockRejectedValue(new Error('db exploded'));
      await expect(ExportService.exportData('json')).resolves.toBeUndefined();
      expect(mockToast).toHaveBeenCalledWith(expect.anything(), 'error');
    });
  });

  describe('generateTaxReport', () => {
    it('refuses when there are no live transactions', async () => {
      await seedTxns([{ id: 't1', date: '2026-01-01', type: 'income', amount: 10, isDraft: true }]);
      await ExportService.generateTaxReport();
      expect(mockToast).toHaveBeenCalledWith(expect.anything(), 'error');
    });

    it('exports the annual tax PDF for the current year', async () => {
      const { exportTaxPDF } = await import('../../src/services/pdfExport');
      await seedTxns([{ id: 't1', date: '2026-01-01', type: 'income', amount: 10 }]);
      await ExportService.generateTaxReport();
      expect(exportTaxPDF).toHaveBeenCalledTimes(1);
      const fileName = vi.mocked(exportTaxPDF).mock.calls[0][2];
      expect(fileName).toBe(`masarifi_tax_report_${new Date().getFullYear()}.pdf`);
    });
  });

  describe('saveFileNative — web path', () => {
    it('downloads via a data-URI anchor and toasts', async () => {
      await ExportService.saveFileNative('hello', 'f.txt', 'text/plain');
      expect(clickedAnchors).toHaveLength(1);
      expect(clickedAnchors[0].download).toBe('f.txt');
      expect(clickedAnchors[0].href).toContain('data:text/plain;base64,');
      expect(mockToast).toHaveBeenCalled();
    });

    it('passes base64 payloads through without re-encoding', async () => {
      await ExportService.saveFileNative('QUJD', 'f.bin', 'application/octet-stream', true);
      expect(clickedAnchors[0].href).toBe('data:application/octet-stream;base64,QUJD');
    });
  });

  describe('saveFileNative — mobile path', () => {
    it('writes to Documents, toasts success, then offers sharing after a beat', async () => {
      vi.useFakeTimers();
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Filesystem.writeFile).mockResolvedValue({ uri: 'file://docs/f.txt' } as never);

      const saving = ExportService.saveFileNative('data', 'f.txt', 'text/plain');
      expect(Filesystem.writeFile).toHaveBeenCalledWith({
        path: 'f.txt',
        data: 'data',
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
      expect(mockConfirmSheet).not.toHaveBeenCalled(); // not until the 1s beat

      await vi.runAllTimersAsync(); // releases the 1s sharing beat
      await saving;
      expect(mockConfirmSheet).toHaveBeenCalledTimes(1);

      // Confirming shares the saved file URI.
      const onConfirm = mockConfirmSheet.mock.calls[0][1];
      await onConfirm();
      expect(Share.share).toHaveBeenCalledWith(expect.objectContaining({ files: ['file://docs/f.txt'] }));
    });

    it('falls back to the Cache directory when Documents is not writable', async () => {
      vi.useFakeTimers();
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      const writeMock = vi.mocked(Filesystem.writeFile);
      writeMock.mockRejectedValueOnce(new Error('Documents read-only') as never);
      writeMock.mockResolvedValue({ uri: 'file://cache/f.txt' } as never);

      const saving = ExportService.saveFileNative('data', 'f.txt', 'text/plain');
      await vi.advanceTimersByTimeAsync(0); // flush microtasks: first write rejects, fallback fires
      expect(writeMock).toHaveBeenCalledTimes(2);
      expect(writeMock.mock.calls[1][0].directory).toBe(Directory.Cache);
      await vi.runAllTimersAsync();
      await saving;
      expect(mockConfirmSheet).toHaveBeenCalledTimes(1);
    });
  });
});
