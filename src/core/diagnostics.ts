// ============================================
// مصاريفي - نظام التشخيص
// لتتبع الأخطاء والمشاكل على الهاتف
// ============================================
import { Capacitor } from '@capacitor/core';
import { silentFail } from './utils';
import { logger } from './logger';

export interface DiagnosticLog {
  timestamp: string;
  category: string;
  message: string;
  data: unknown;
}

export interface DiagnosticResults {
  timestamp: string;
  capacitor: { available: boolean; isNative: boolean };
  indexeddb: boolean;
  network: boolean;
  userAgent: string;
  language: string;
  timezone: string;
}

const diagnosticLogs: DiagnosticLog[] = [];
const MAX_LOGS = 100;

export function addDiagnosticLog(category: string, message: string, data: unknown = null): void {
  const timestamp = new Date().toISOString();
  const log: DiagnosticLog = { timestamp, category, message, data };

  diagnosticLogs.push(log);
  if (diagnosticLogs.length > MAX_LOGS) {
    diagnosticLogs.shift();
  }

  logger.debug(category, message, data || '');
}

export function getDiagnosticLogs(): DiagnosticLog[] {
  return diagnosticLogs;
}

export async function saveDiagnosticsToStorage(): Promise<void> {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({
      key: 'masarifi_diagnostics',
      value: JSON.stringify(diagnosticLogs)
    });
    addDiagnosticLog('STORAGE', 'Diagnostics saved to storage');
  } catch (e) {
    silentFail('Failed to save diagnostics')(e);
  }
}

export async function loadDiagnosticsFromStorage(): Promise<DiagnosticLog[]> {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key: 'masarifi_diagnostics' });
    if (value) {
      const logs = JSON.parse(value) as DiagnosticLog[];
      diagnosticLogs.length = 0;
      diagnosticLogs.push(...logs);
      addDiagnosticLog('STORAGE', 'Diagnostics loaded from storage');
      return logs;
    }
  } catch (e) {
    silentFail('Failed to load diagnostics')(e);
  }
  return [];
}

export function clearDiagnostics(): void {
  diagnosticLogs.length = 0;
  addDiagnosticLog('STORAGE', 'Diagnostics cleared');
}

// Check if Capacitor is available
export function checkCapacitorAvailability(): { available: boolean; isNative: boolean } {
  const isNative = Capacitor.isNativePlatform();

  addDiagnosticLog('CAPACITOR', 'Availability check', {
    available: true,
    isNative,
    platform: Capacitor.getPlatform()
  });

  return { available: true, isNative };
}

// Check IndexedDB availability
export async function checkIndexedDBAvailability(): Promise<boolean> {
  try {
    const test = indexedDB.open('__test__');
    return new Promise((resolve) => {
      test.onsuccess = () => {
        test.result.close();
        addDiagnosticLog('INDEXEDDB', 'Available and working');
        resolve(true);
      };
      test.onerror = () => {
        addDiagnosticLog('INDEXEDDB', 'Error or not available');
        resolve(false);
      };
    });
  } catch (e: unknown) {
    const err = e as Error;
    addDiagnosticLog('INDEXEDDB', 'Check failed', err.message);
    return false;
  }
}

// Check network connectivity
export function checkNetworkConnectivity(): boolean {
  const online = navigator.onLine;
  addDiagnosticLog('NETWORK', 'Connectivity check', { online });
  return online;
}

// Run all diagnostics
export async function runFullDiagnostics(): Promise<DiagnosticResults> {
  addDiagnosticLog('DIAGNOSTICS', 'Starting full diagnostic check');

  const results: DiagnosticResults = {
    timestamp: new Date().toISOString(),
    capacitor: checkCapacitorAvailability(),
    indexeddb: await checkIndexedDBAvailability(),
    network: checkNetworkConnectivity(),
    userAgent: navigator.userAgent,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };

  addDiagnosticLog('DIAGNOSTICS', 'Full diagnostic check complete', results);
  return results;
}
