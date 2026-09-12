/**
 * settingsService.ts
 * 
 * Ported service for managing backups, cloud sync, and advanced system actions.
 */

import { db as DB } from '@/core/db/core';
import { toast } from '../../../toast';
import { t } from '../../../i18n/engine';
import { bridge, registerToBridge } from '../../../core/AppBridge';
import * as Cloud from '../../../core/cloud';
import { purifyRecord } from '../../../core/security';
import { recordException } from '../../../core/crashlytics';

// Re-export cloud functions
export const cloudSignIn = Cloud.cloudSignIn;
export const cloudSignUp = Cloud.cloudSignUp;
export const cloudSignOut = Cloud.cloudSignOut;
export const cloudBackup = Cloud.cloudBackup;
export const cloudRestore = Cloud.cloudRestore;
export const getCloudBackupInfo = Cloud.getCloudBackupInfo;
export const getCloudSession = Cloud.getCloudSession;

export async function ensureSettingsReady(): Promise<void> {
  // No-op in modern version as everything is pre-loaded
  return Promise.resolve();
}

// ─── Local Backup ────────────────────────────────────────────────────────────

export function exportEncrypted(): void {
  bridge.promptSheet(
    t('settings.exportEncPassword') || 'أدخل كلمة مرور التشفير للنسخة الاحتياطية (أو اتركها فارغة للحفظ بدون تشفير):',
    async (password) => {
      // If user confirms with empty password, offer unencrypted backup
      if (!password) {
        bridge.confirmSheet(
          'هل تريد تصدير نسخة احتياطية غير مشفرة؟ / Export unencrypted backup?',
          async () => {
            try {
              toast(t('settings.exporting') || 'جاري التصدير...', 'info');
              const allData = await collectAllLocalData();
              const blob = new Blob([JSON.stringify(allData)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `masarifi_backup_${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
              toast(t('settings.exportSuccess'), 'success');
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              toast('Error: ' + msg, 'error');
            }
          },
          t('action.export') || 'تصدير',
          t('action.cancel') || 'إلغاء'
        );
        return;
      }

      if (password.length < 6) {
        toast(t('settings.errPasswordShort') || 'كلمة المرور قصيرة جداً (6 رموز كحد أدنى)', 'error');
        return;
      }

      try {
        toast(t('settings.exporting') || 'جاري التصدير والتشفير...', 'info');
        const allData = await collectAllLocalData();
        const envelope = await Cloud.encryptPayload(allData, password);

        const blob = new Blob([JSON.stringify(envelope)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `masarifi_backup_${new Date().toISOString().slice(0, 10)}.enc`;
        a.click();
        URL.revokeObjectURL(url);
        toast(t('settings.exportSuccess'), 'success');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        toast('Error: ' + msg, 'error');
      }
    },
    '••••••',
    true // isPassword
  );
}

/**
 * Dynamically collects 100% of IndexedDB tables and localStorage state.
 */
async function collectAllLocalData(): Promise<Record<string, unknown>> {
  const allData: Record<string, unknown> = {};
  
  // 1. Read all IndexedDB tables dynamically
  for (const table of DB.tables) {
    allData[table.name] = await table.toArray();
  }

  // 2. Read all relevant localStorage values
  const localStoreData: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('masarifi') || key === 'baseCurrency' || key === 'language')) {
      localStoreData[key] = localStorage.getItem(key) || '';
    }
  }
  
  allData['localStorage'] = localStoreData;
  allData['exportedAt'] = new Date().toISOString();
  allData['version'] = '21.7.16';

  return allData;
}

/**
 * Handles the complete, secure, and transactional local restoration process.
 */
export async function restoreBackup(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        let data: Record<string, unknown>;

        try {
          data = JSON.parse(text);
        } catch {
          toast(t('settings.errInvalidFile') || 'صيغة ملف غير صالحة', 'error');
          reject(new Error('Invalid file format'));
          return;
        }

        const isEncrypted = Boolean(data && data.salt && data.iv && data.cipher);

        if (isEncrypted) {
          bridge.promptSheet(
            t('settings.importEncPassword') || 'أدخل كلمة مرور فك التشفير للنسخة الاحتياطية:',
            async (password) => {
              if (!password) {
                toast('كلمة المرور مطلوبة لفك التشفير!', 'error');
                reject(new Error('Password required'));
                return;
              }
              try {
                toast('جاري فك التشفير والتطهير أمنياً...', 'info');
                const decrypted = await Cloud.decryptPayload(data as unknown as Cloud.EncryptedEnvelope, password);
                await performRestore(decrypted as Record<string, unknown>);
                resolve();
              } catch {
                toast(t('settings.errWrongPassword') || 'كلمة مرور خاطئة أو ملف تالف!', 'error');
                reject(new Error('Wrong password'));
              }
            },
            '••••••',
            true // isPassword
          );
        } else {
          bridge.confirmSheet(
            t('settings.wipeConfirm') || 'هل أنت متأكد من استعادة هذه النسخة الاحتياطية؟ سيتم مسح كافة البيانات الحالية بالكامل واستبدالها.',
            async () => {
              try {
                await performRestore(data);
                resolve();
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                toast('Error: ' + msg, 'error');
                reject(err instanceof Error ? err : new Error(msg));
              }
            },
            t('action.confirm') || 'استعادة',
            t('action.cancel') || 'إلغاء'
          );
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('File reading failed'));
    reader.readAsText(file);
  });
}

/**
 * Atomic and recursive secure restoration helper.
 */
async function performRestore(data: Record<string, unknown>): Promise<void> {
  if (!data || typeof data !== 'object') {
    throw new Error('بيانات النسخة الاحتياطية غير صالحة');
  }

  // Basic validation check (must contain transactions or accounts or categories at minimum)
  const hasMinData = data.transactions || data.accounts || data.categories;
  if (!hasMinData) {
    throw new Error('ملف النسخة الاحتياطية فارغ أو غير متوافق');
  }

  try {
    toast(t('settings.importing') || 'جاري استيراد البيانات وتأمينها...', 'info');

    // 1. Transactional Database Restore (Atomic safety - roll back on failure)
    await DB.transaction('rw', DB.tables, async () => {
      // Clear current database state
      for (const table of DB.tables) {
        await table.clear();
      }

      // Restore all tables dynamically (including newly added tables like cards, assets)
      for (const table of DB.tables) {
        const items = data[table.name];
        if (Array.isArray(items)) {
          // Permanently block Stored XSS by recursively sanitizing all string values in the records
          const purifiedItems = purifyRecord(items);
          await table.bulkPut(purifiedItems);
        }
      }

      // Restore legacy settings format if present (when settings were saved as dict instead of table entries)
      if (data.settings && !Array.isArray(data.settings) && typeof data.settings === 'object') {
        for (const [k, v] of Object.entries(data.settings as Record<string, unknown>)) {
          await DB.settings.put({ id: k, key: k, value: v });
        }
      }
    });

    // 2. Restore localStorage state
    if (data.localStorage && typeof data.localStorage === 'object') {
      for (const [k, v] of Object.entries(data.localStorage as Record<string, string>)) {
        localStorage.setItem(k, v);
      }
    }

    // 3. Record secure audit trace
    const exportedAt = typeof data.exportedAt === 'string' ? data.exportedAt : 'unknown';
    const version = typeof data.version === 'string' ? data.version : 'legacy';
    await DB.recordAction('import_data', `Restored local backup exported at ${exportedAt} (version: ${version})`);

    toast(t('settings.importSuccess') || '✅ تم استعادة البيانات بنجاح تام!', 'success');
    
    // Refresh the application environment to reload state and stores
    setTimeout(() => window.location.reload(), 1500);
  } catch (err: unknown) {
    recordException('[performRestore] Backup restore failed', err as Error);
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(msg || 'فشلت عملية استيراد البيانات', { cause: err });
  }
}

// Register the restore handler on the AppBridge for global type-safe access
registerToBridge('restoreBackup', restoreBackup);

export async function exportCSV(): Promise<void> {
  try {
    const { ExportService } = await import('../../reports/services/exportService');
    await ExportService.exportData('csv');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    toast('CSV Export failed: ' + msg, 'error');
  }
}

export async function exportExcel(): Promise<void> {
  try {
    const { ExportService } = await import('../../reports/services/exportService');
    await ExportService.exportData('xlsx');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    toast('Excel Export failed: ' + msg, 'error');
  }
}

// ─── Demo Data ───────────────────────────────────────────────────────────────

export async function loadDemoData(clearFirst = false): Promise<void> {
  try {
    toast(t('settings.loadingDemo') || 'Loading demo data...', 'info');
    await DB.seedDemoData(clearFirst);
    toast(t('settings.demoSuccess') || 'Demo data loaded successfully!', 'success');
    setTimeout(() => window.location.reload(), 1500);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    toast('Error: ' + msg, 'error');
  }
}

export async function deleteDemoData(onlyDemo = true): Promise<void> {
  try {
    if (!onlyDemo) {
      await DB.clearAll();
      toast(t('settings.wipeSuccess') || 'All data wiped', 'success');
    } else {
      const count = await DB.clearDemoData();
      toast(`${count} ${t('settings.demoDeleted') || 'demo items deleted'}`, 'success');
    }
    setTimeout(() => window.location.reload(), 1500);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    toast('Error: ' + msg, 'error');
  }
}

// ─── Danger Zone ─────────────────────────────────────────────────────────────

export function secureWipe(): void {
  bridge.confirmSheet(
    t('settings.wipeConfirm') || 'ERASE EVERYTHING? This cannot be undone.',
    async () => {
      await DB.clearAll();
      window.location.reload();
    },
    t('action.delete') || 'مسح شامل',
    t('action.cancel') || 'إلغاء'
  );
}

// ─── Recalculate Balances ─────────────────────────────────────────────────────

export async function recalculateBalances(): Promise<void> {
  try {
    const accounts = await DB.getAccounts();
    const txns = await DB.getTransactions();
    for (const acc of accounts) {
      const accountTxns = txns.filter(tx => tx.accountId === acc.id);
      const income = accountTxns.filter(tx => tx.type === 'income').reduce((s, tx) => s + (Number(tx.amount) || 0), 0);
      const expense = accountTxns.filter(tx => tx.type === 'expense').reduce((s, tx) => s + (Number(tx.amount) || 0), 0);
      const newBalance = (acc.initialBalance || 0) + income - expense;
      await DB.updateAccount(acc.id, { balance: newBalance });
    }
    toast(t('settings.recalculateSuccess') || 'Balances recalculated!', 'success');
  } catch (err: unknown) {
    recordException('[recalculateBalances] Error recalculating balances', err as Error);
    const msg = err instanceof Error ? err.message : String(err);
    toast('Error: ' + msg, 'error');
  }
}
