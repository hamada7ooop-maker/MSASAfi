import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ensureSettingsReady,
  exportEncrypted,
  restoreBackup,
  exportCSV,
  exportExcel,
  loadDemoData,
  deleteDemoData,
  secureWipe,
  recalculateBalances,
} from '../../src/features/settings/services/settingsService';
import { registerToBridge, bridge } from '../../src/core/AppBridge';
import { toast } from '../../src/toast';
import { encryptPayload, decryptPayload } from '../../src/core/cloud';
import { recordException } from '../../src/core/crashlytics';
import { evaluateRestoreProtection } from '../../src/core/security/vaultRecovery';
import { ExportService } from '../../src/features/reports/services/exportService';
import { db as DB } from '../../src/core/db/core';
import { APP_VERSION } from '../../src/core/constants';
import { VAULT_SECRET_KEYS } from '../../src/core/backupSafety';

// ── Module mocks (the service's UI + crypto edges) ──────────────────────────
// The database, backupSafety, purifyRecord and i18n stay REAL — this suite
// characterizes the actual backup/restore data flow, not the mocks.

vi.mock('../../src/toast', () => ({ toast: vi.fn() }));

vi.mock('../../src/core/AppBridge', () => ({
  bridge: { promptSheet: vi.fn(), confirmSheet: vi.fn() },
  registerToBridge: vi.fn(),
}));

vi.mock('../../src/core/cloud', () => ({
  cloudSignIn: vi.fn(),
  cloudSignUp: vi.fn(),
  cloudSignOut: vi.fn(),
  cloudBackup: vi.fn(),
  cloudRestore: vi.fn(),
  getCloudBackupInfo: vi.fn(),
  getCloudSession: vi.fn(),
  encryptPayload: vi.fn(),
  decryptPayload: vi.fn(),
}));

vi.mock('../../src/core/crashlytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/core/crashlytics')>()),
  recordException: vi.fn(),
}));

vi.mock('../../src/core/security/vaultRecovery', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/core/security/vaultRecovery')>()),
  evaluateRestoreProtection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/features/reports/services/exportService', () => ({
  ExportService: { exportData: vi.fn() },
}));

const mockToast = vi.mocked(toast);
const mockPrompt = vi.mocked(bridge.promptSheet);
const mockConfirm = vi.mocked(bridge.confirmSheet);
const mockEncrypt = vi.mocked(encryptPayload);
const mockDecrypt = vi.mocked(decryptPayload);

/** Submit a value to the most recently shown prompt sheet. */
async function submitPrompt(password: string): Promise<void> {
  const call = mockPrompt.mock.calls.at(-1);
  if (!call) throw new Error('promptSheet was not shown');
  await call[1](password);
}

/** Confirm the most recently shown confirmation sheet. */
async function submitConfirm(): Promise<void> {
  const call = mockConfirm.mock.calls.at(-1);
  if (!call) throw new Error('confirmSheet was not shown');
  await call[1]();
}

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('blob read failed'));
    reader.readAsText(blob);
  });
}

function jsonFile(data: unknown): File {
  return new File([JSON.stringify(data)], 'backup.json', { type: 'application/json' });
}

describe('Settings Service Unit Tests (settingsService.ts)', () => {
  let clickedAnchors: HTMLAnchorElement[];
  let reloadSpy: ReturnType<typeof vi.fn>;
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let lsStore: Map<string, string>;

  beforeEach(async () => {
    // Selective clearing: registerToBridge's module-load call record must
    // survive (clearAllMocks would erase the wiring assertion below).
    mockToast.mockClear();
    mockPrompt.mockClear();
    mockConfirm.mockClear();
    mockEncrypt.mockReset();
    mockDecrypt.mockReset();
    vi.mocked(recordException).mockClear();
    vi.mocked(evaluateRestoreProtection).mockReset().mockResolvedValue(undefined);
    vi.mocked(ExportService.exportData).mockReset();

    for (const table of DB.tables) {
      await table.clear();
    }

    // The global setup's localStorage mock has no length/key(i) enumeration;
    // collectAllLocalData relies on both, so install a complete Storage shim.
    lsStore = new Map();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => lsStore.get(key) ?? null,
        setItem: (key: string, value: unknown) => {
          lsStore.set(key, String(value));
        },
        removeItem: (key: string) => {
          lsStore.delete(key);
        },
        clear: () => {
          lsStore.clear();
        },
        key: (index: number) => Array.from(lsStore.keys())[index] ?? null,
        get length() {
          return lsStore.size;
        },
      },
    });

    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake-url');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    clickedAnchors = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      clickedAnchors.push(this);
    });

    reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload: reloadSpy, href: 'http://localhost/' },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('ensureSettingsReady', () => {
    it('resolves immediately (no-op in the modern version)', async () => {
      await expect(ensureSettingsReady()).resolves.toBeUndefined();
    });
  });

  describe('bridge wiring', () => {
    it('registers restoreBackup on the AppBridge', () => {
      expect(registerToBridge).toHaveBeenCalledWith('restoreBackup', expect.any(Function));
    });
  });

  describe('exportEncrypted — vault protection', () => {
    it('refuses an unencrypted export when a PIN hash protects the vault', async () => {
      await DB.settings.put({ id: 'pinHash', key: 'pinHash', value: 'some-hash' });
      exportEncrypted();
      await submitPrompt('');
      expect(mockToast).toHaveBeenCalledWith(expect.any(String), 'error');
      expect(mockConfirm).not.toHaveBeenCalled();
      expect(createObjectURLSpy).not.toHaveBeenCalled();
    });

    it('refuses an unencrypted export when a legacy PIN setting exists', async () => {
      await DB.settings.put({ id: 'pin', key: 'pin', value: '1234' });
      exportEncrypted();
      await submitPrompt('');
      expect(mockToast).toHaveBeenCalledWith(expect.any(String), 'error');
      expect(mockConfirm).not.toHaveBeenCalled();
    });

    it('rejects passwords shorter than 6 characters', async () => {
      exportEncrypted();
      await submitPrompt('12345');
      expect(mockToast).toHaveBeenCalledWith(expect.any(String), 'error');
      expect(mockEncrypt).not.toHaveBeenCalled();
      expect(createObjectURLSpy).not.toHaveBeenCalled();
    });
  });

  describe('exportEncrypted — unencrypted path (no vault)', () => {
    it('asks for confirmation, then downloads a .json backup of all local data', async () => {
      await DB.transactions.put({
        id: 't1',
        description: 'coffee',
        amount: 20,
        type: 'expense',
        accountId: 'acc1',
        date: '2026-09-01',
      });
      localStorage.setItem('masarifi_theme', 'dark');
      localStorage.setItem('baseCurrency', 'SAR');
      localStorage.setItem('language', 'ar');
      localStorage.setItem('unrelated_key', 'nope');

      exportEncrypted();
      await submitPrompt('');

      expect(mockConfirm).toHaveBeenCalledTimes(1);
      await submitConfirm();

      expect(clickedAnchors).toHaveLength(1);
      expect(clickedAnchors[0].download).toMatch(/^masarifi_backup_\d{4}-\d{2}-\d{2}\.json$/);
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:fake-url');
      expect(mockToast).toHaveBeenCalledWith(expect.any(String), 'success');

      const blob = createObjectURLSpy.mock.calls.at(-1)?.[0] as Blob;
      const payload = JSON.parse(await readBlob(blob)) as Record<string, unknown>;
      for (const table of DB.tables) {
        expect(payload[table.name]).toBeDefined();
      }
      const ls = payload['localStorage'] as Record<string, string>;
      expect(ls['masarifi_theme']).toBe('dark');
      expect(ls['baseCurrency']).toBe('SAR');
      expect(ls['language']).toBe('ar');
      expect(ls['unrelated_key']).toBeUndefined();
      expect(payload['version']).toBe(APP_VERSION);
      expect(typeof payload['exportedAt']).toBe('string');
    });

    it('strips vault-secret settings rows even without a PIN', async () => {
      const secretKey = VAULT_SECRET_KEYS[0];
      await DB.settings.put({ id: secretKey, key: secretKey, value: 'device-key-material' });
      await DB.settings.put({ id: 'themePref', key: 'themePref', value: 'dim' });

      exportEncrypted();
      await submitPrompt('');
      await submitConfirm();

      const blob = createObjectURLSpy.mock.calls.at(-1)?.[0] as Blob;
      const payload = JSON.parse(await readBlob(blob)) as { settings: Array<{ key: string }> };
      const exportedKeys = payload.settings.map((row) => row.key);
      expect(exportedKeys).toContain('themePref');
      expect(exportedKeys).not.toContain(secretKey);
    });
  });

  describe('exportEncrypted — encrypted path', () => {
    it('encrypts the payload and downloads a .enc backup', async () => {
      const envelope = { salt: 's', iv: 'i', cipher: 'c' };
      mockEncrypt.mockResolvedValue(envelope);
      exportEncrypted();
      await submitPrompt('secret123');

      expect(mockEncrypt).toHaveBeenCalledTimes(1);
      expect(mockEncrypt.mock.calls[0][1]).toBe('secret123');
      expect(clickedAnchors).toHaveLength(1);
      expect(clickedAnchors[0].download).toMatch(/\.enc$/);

      const blob = createObjectURLSpy.mock.calls.at(-1)?.[0] as Blob;
      expect(JSON.parse(await readBlob(blob))).toEqual(envelope);
      expect(mockToast).toHaveBeenCalledWith(expect.any(String), 'success');
    });

    it('surfaces encryption failures as an error toast', async () => {
      mockEncrypt.mockRejectedValue(new Error('key derivation failed'));
      exportEncrypted();
      await submitPrompt('secret123');
      expect(mockToast).toHaveBeenCalledWith(expect.stringContaining('key derivation failed'), 'error');
      expect(clickedAnchors).toHaveLength(0);
    });
  });

  describe('restoreBackup — file reading', () => {
    it('rejects invalid JSON with a clear error', async () => {
      const file = new File(['{ this is not json'], 'broken.json');
      await expect(restoreBackup(file)).rejects.toThrow('Invalid file format');
      expect(mockToast).toHaveBeenCalledWith(expect.any(String), 'error');
    });

    it('rejects when the file cannot be read', async () => {
      class FailingFileReader {
        onload: (() => void) | null = null;
        onerror: ((ev: unknown) => void) | null = null;
        result: string | null = null;
        readAsText(): void {
          queueMicrotask(() => this.onerror?.(new Error('disk error')));
        }
      }
      vi.stubGlobal('FileReader', FailingFileReader);
      await expect(restoreBackup(new File(['x'], 'x.json'))).rejects.toThrow('File reading failed');
    });
  });

  describe('restoreBackup — encrypted files', () => {
    const envelope = { salt: 's', iv: 'i', cipher: 'c', transactions: [] };

    it('asks for the decryption password (password sheet)', async () => {
      const promise = restoreBackup(jsonFile(envelope));
      await vi.waitFor(() => expect(mockPrompt).toHaveBeenCalled());
      expect(mockPrompt.mock.calls[0][3]).toBe(true); // isPassword
      mockPrompt.mock.calls[0][1](''); // dismiss without password
      await expect(promise).rejects.toThrow('Password required');
    });

    it('rejects with "Wrong password" when decryption fails', async () => {
      mockDecrypt.mockRejectedValue(new Error('bad key'));
      const promise = restoreBackup(jsonFile(envelope));
      await vi.waitFor(() => expect(mockPrompt).toHaveBeenCalled());
      mockPrompt.mock.calls[0][1]('wrong-password');
      await expect(promise).rejects.toThrow('Wrong password');
      expect(mockToast).toHaveBeenCalledWith(expect.any(String), 'error');
    });

    it('decrypts and restores the payload on the correct password', async () => {
      mockDecrypt.mockResolvedValue({ transactions: [{ id: 'r1', description: 'x', amount: 5, type: 'expense', accountId: 'a', date: '2026-01-01' }] });
      const promise = restoreBackup(jsonFile(envelope));
      await vi.waitFor(() => expect(mockPrompt).toHaveBeenCalled());
      await mockPrompt.mock.calls[0][1]('right-password');
      await expect(promise).resolves.toBeUndefined();
      expect(mockDecrypt).toHaveBeenCalledWith(envelope, 'right-password');
      expect((await DB.transactions.toArray()).map((t) => t.id)).toEqual(['r1']);
    });
  });

  describe('restoreBackup — plain backups (performRestore)', () => {
    it('restores tables, preserves this device vault identity and local storage, and audits', async () => {
      // Local state: one existing transaction + a local PIN hash that must survive.
      await DB.transactions.put({ id: 'old-txn', description: 'old', amount: 1, type: 'expense', accountId: 'a', date: '2026-01-01' });
      await DB.settings.put({ id: 'pinHash', key: 'pinHash', value: 'local-hash' });

      const secretKey = VAULT_SECRET_KEYS[0];
      const data = {
        transactions: [
          { id: 'n1', description: 'salary', amount: 100, type: 'income', accountId: 'a', date: '2026-02-01' },
          { id: 'n2', description: 'bus', amount: 10, type: 'expense', accountId: 'a', date: '2026-02-02' },
        ],
        accounts: [{ id: 'a', name: 'Cash', balance: 0 }],
        settings: [
          { id: 'pinHash', key: 'pinHash', value: 'foreign-hash' },
          { id: 'baseCurrency', key: 'baseCurrency', value: 'USD' },
        ],
        localStorage: {
          language: 'en',
          masarifi_theme: 'dark',
          [secretKey]: 'foreign-key-material',
        },
        exportedAt: '2026-01-01T00:00:00.000Z',
        version: '22.9.9',
      };

      const promise = restoreBackup(jsonFile(data));
      await vi.waitFor(() => expect(mockConfirm).toHaveBeenCalled());
      await submitConfirm();
      await expect(promise).resolves.toBeUndefined();

      // Tables were wiped and repopulated with the backup's rows.
      expect((await DB.transactions.toArray()).map((t) => t.id).sort()).toEqual(['n1', 'n2']);
      expect((await DB.accounts.toArray()).map((a) => a.id)).toEqual(['a']);

      // This device's vault identity is preserved; the foreign one is dropped.
      expect(await DB.getSetting('pinHash')).toBe('local-hash');
      expect(await DB.getSetting('baseCurrency')).toBe('USD');

      // localStorage restored, minus vault-secret keys.
      expect(localStorage.getItem('language')).toBe('en');
      expect(localStorage.getItem('masarifi_theme')).toBe('dark');
      expect(localStorage.getItem(secretKey)).toBeNull();

      // Restore protection ran and the action was audited.
      expect(evaluateRestoreProtection).toHaveBeenCalled();
      const auditRows = await DB.auditLog.toArray();
      expect(auditRows.some((r) => r.action === 'import_data')).toBe(true);

      expect(mockToast).toHaveBeenCalledWith(expect.any(String), 'success');
      // The reload is deferred (setTimeout), never synchronous.
      expect(reloadSpy).not.toHaveBeenCalled();
    });

    it('restores legacy dict-style settings objects into table rows', async () => {
      const data = {
        transactions: [{ id: 'l1', description: 'x', amount: 1, type: 'expense', accountId: 'a', date: '2026-01-01' }],
        settings: { baseCurrency: 'EUR', theme: 'light' },
      };
      const promise = restoreBackup(jsonFile(data));
      await vi.waitFor(() => expect(mockConfirm).toHaveBeenCalled());
      await submitConfirm();
      await expect(promise).resolves.toBeUndefined();
      expect(await DB.getSetting('baseCurrency')).toBe('EUR');
      expect(await DB.getSetting('theme')).toBe('light');
    });

    it('rejects backups without transactions, accounts or categories', async () => {
      const promise = restoreBackup(jsonFile({ bills: [{ id: 'b1' }] }));
      await vi.waitFor(() => expect(mockConfirm).toHaveBeenCalled());
      await submitConfirm();
      await expect(promise).rejects.toThrow('ملف النسخة الاحتياطية فارغ أو غير متوافق');
      expect(mockToast).toHaveBeenCalledWith(expect.any(String), 'error');
    });

    it('rolls the database back atomically when a write fails mid-restore', async () => {
      await DB.transactions.put({ id: 'survivor', description: 'keep', amount: 1, type: 'expense', accountId: 'a', date: '2026-01-01' });
      // Spy on the table instance DB.tables yields — performRestore iterates
      // those (stable) instances, not the db.transactions accessor.
      const txTable = DB.tables.find((t) => t.name === 'transactions');
      if (!txTable) throw new Error('transactions table missing');
      vi.spyOn(txTable, 'bulkPut').mockRejectedValue(new Error('disk full'));

      const data = {
        transactions: [{ id: 'new1', description: 'x', amount: 1, type: 'expense', accountId: 'a', date: '2026-01-01' }],
      };
      const promise = restoreBackup(jsonFile(data));
      await vi.waitFor(() => expect(mockConfirm).toHaveBeenCalled());
      await submitConfirm();
      await expect(promise).rejects.toThrow('disk full');

      // The transaction rolled back: the pre-restore row is still there.
      expect((await DB.transactions.toArray()).map((t) => t.id)).toEqual(['survivor']);
      expect(mockToast).toHaveBeenCalledWith(expect.stringContaining('disk full'), 'error');
    });
  });

  describe('exportCSV / exportExcel', () => {
    it('delegates CSV export to the reports ExportService', async () => {
      vi.mocked(ExportService.exportData).mockResolvedValue(undefined);
      await exportCSV();
      expect(ExportService.exportData).toHaveBeenCalledWith('csv');
    });

    it('delegates Excel export to the reports ExportService', async () => {
      vi.mocked(ExportService.exportData).mockResolvedValue(undefined);
      await exportExcel();
      expect(ExportService.exportData).toHaveBeenCalledWith('xlsx');
    });

    it('surfaces export failures as an error toast', async () => {
      vi.mocked(ExportService.exportData).mockRejectedValue(new Error('sheet too large'));
      await exportCSV();
      expect(mockToast).toHaveBeenCalledWith(
        expect.stringContaining('CSV Export failed'),
        'error'
      );
    });
  });

  describe('loadDemoData', () => {
    it('seeds demo data (clearFirst passthrough) and reports success', async () => {
      const seedSpy = vi.spyOn(DB, 'seedDemoData').mockResolvedValue(undefined);
      await loadDemoData(true);
      expect(seedSpy).toHaveBeenCalledWith(true);
      expect(mockToast).toHaveBeenCalledWith(expect.any(String), 'success');
    });

    it('defaults to seeding without clearing', async () => {
      const seedSpy = vi.spyOn(DB, 'seedDemoData').mockResolvedValue(undefined);
      await loadDemoData();
      expect(seedSpy).toHaveBeenCalledWith(false);
    });

    it('surfaces seeding failures as an error toast', async () => {
      vi.spyOn(DB, 'seedDemoData').mockRejectedValue(new Error('seed failed'));
      await loadDemoData();
      expect(mockToast).toHaveBeenCalledWith(expect.stringContaining('seed failed'), 'error');
    });
  });

  describe('deleteDemoData', () => {
    it('deletes only demo rows and reports the count', async () => {
      vi.spyOn(DB, 'clearDemoData').mockResolvedValue(7);
      await deleteDemoData();
      expect(mockToast).toHaveBeenCalledWith(expect.stringContaining('7'), 'success');
      expect(mockToast).toHaveBeenCalledWith(expect.any(String), 'success');
    });

    it('wipes everything when onlyDemo is false', async () => {
      const clearAllSpy = vi.spyOn(DB, 'clearAll').mockResolvedValue(undefined);
      await deleteDemoData(false);
      expect(clearAllSpy).toHaveBeenCalledTimes(1);
      expect(mockToast).toHaveBeenCalledWith(expect.any(String), 'success');
    });
  });

  describe('secureWipe', () => {
    it('requires confirmation, then wipes the database and reloads', async () => {
      const clearAllSpy = vi.spyOn(DB, 'clearAll').mockResolvedValue(undefined);
      secureWipe();
      expect(mockConfirm).toHaveBeenCalledTimes(1);
      await submitConfirm();
      expect(clearAllSpy).toHaveBeenCalledTimes(1);
      expect(reloadSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('recalculateBalances', () => {
    it('recomputes each account balance from initial balance + income − expense', async () => {
      await DB.accounts.bulkPut([
        { id: 'acc1', name: 'Cash', initialBalance: 1000, balance: 999 },
        { id: 'acc2', name: 'Bank', initialBalance: 500, balance: 0 },
      ]);
      await DB.transactions.bulkPut([
        { id: 't1', accountId: 'acc1', type: 'income', amount: 500, description: 'i', date: '2026-01-01' },
        { id: 't2', accountId: 'acc1', type: 'expense', amount: 200, description: 'e', date: '2026-01-02' },
        { id: 't3', accountId: 'ghost', type: 'income', amount: 1, description: 'orphan', date: '2026-01-03' },
      ]);

      await recalculateBalances();

      expect((await DB.accounts.get('acc1'))?.balance).toBe(1300);
      expect((await DB.accounts.get('acc2'))?.balance).toBe(500);
      expect(mockToast).toHaveBeenCalledWith(expect.any(String), 'success');
    });

    it('records the exception and shows an error toast when recalculation fails', async () => {
      vi.spyOn(DB, 'getAccounts').mockRejectedValue(new Error('db locked'));
      await recalculateBalances();
      expect(recordException).toHaveBeenCalledWith(
        '[recalculateBalances] Error recalculating balances',
        expect.any(Error)
      );
      expect(mockToast).toHaveBeenCalledWith(expect.stringContaining('db locked'), 'error');
    });
  });
});
