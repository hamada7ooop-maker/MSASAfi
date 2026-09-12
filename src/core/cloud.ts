// ============================================
// مصاريفي — Cloud Sync via Supabase
// End-to-End Encrypted sync for all user data
// ============================================

import { db as DB } from './db/core';
import { toast } from '../toast';
import { t } from '../i18n/engine';
import { secureGet, secureSet, secureRemove } from './secureStore';
import { APP_VERSION } from './constants';
import { silentFail } from './utils';

const PROXY_URL = import.meta.env.VITE_PROXY_URL || 'http://localhost:3000/supabase';

export interface CloudSession {
  access_token: string;
  refresh_token?: string;
  user?: { id: string; email?: string };
  expires_at?: number;
}

export interface EncryptedEnvelope {
  salt: string;
  iv: string;
  cipher: string;
  v: number;
}

export interface BackupInfo {
  backed_up_at: string;
  version: string;
  record_counts?: Record<string, number>;
}

// ─── Auth Helpers ────────────────────────────────────────────────────────────

export async function getCloudSession(): Promise<CloudSession | null> {
  try {
    const raw = await secureGet('masarifi_cloud_session');
    if (!raw) return null;
    const session = JSON.parse(raw) as CloudSession;
    if (session.expires_at && Date.now() > session.expires_at) {
      await secureRemove('masarifi_cloud_session');
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

async function saveCloudSession(session: CloudSession): Promise<void> {
  const data: CloudSession = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    user: session.user,
    expires_at: session.expires_at ? session.expires_at * 1000 : Date.now() + 3600_000,
  };
  await secureSet('masarifi_cloud_session', JSON.stringify(data));
}

export async function clearCloudSession(): Promise<void> {
  await secureRemove('masarifi_cloud_session');
}

// ─── API Request Helper ──────────────────────────────────────────────────────

async function sbFetch<T = unknown>(path: string, options: RequestInit = {}, retries = 3): Promise<T> {
  const session = await getCloudSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };
  const url = `${PROXY_URL}${path}`;

  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const signal = options.signal || controller.signal;

    try {
      const res = await fetch(url, { ...options, headers, signal });
      clearTimeout(timeout);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Supabase error ${res.status}: ${errText}`);
      }
      const text = await res.text();
      return (text ? JSON.parse(text) : null) as T;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      silentFail(`[Cloud] Network request failed (Attempt ${attempt + 1}/${retries})`)(error);
      if (attempt < retries - 1) {
        // Exponential backoff: 1s, 2s, 4s...
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

// ─── Auth: Sign Up / Sign In / Sign Out ─────────────────────────────────────

export async function cloudSignUp(email: string, password: string): Promise<CloudSession> {
  const data = await sbFetch<{ session?: CloudSession }>('/auth/v1/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (data?.session) await saveCloudSession(data.session);
  return (data?.session || data) as CloudSession;
}

export async function cloudSignIn(email: string, password: string): Promise<CloudSession> {
  const data = await sbFetch<CloudSession>('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (data?.access_token) await saveCloudSession(data);
  return data;
}

export async function cloudSignOut(): Promise<void> {
  try {
    const session = await getCloudSession();
    if (session?.access_token) {
      await sbFetch('/auth/v1/logout', { method: 'POST' });
    }
  } catch (_) {
    // Ignore signOut network errors
  }
  await clearCloudSession();
}

export async function cloudRefreshSession(): Promise<CloudSession | null> {
  const session = await getCloudSession();
  if (!session?.refresh_token) return null;
  try {
    const data = await sbFetch<CloudSession>('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    if (data?.access_token) {
      await saveCloudSession(data);
      return data;
    }
  } catch (_) {
    // Refresh failed
  }
  await clearCloudSession();
  return null;
}

// ─── E2E Encryption ─────────────────────────────────────────────────────────

async function deriveEncKey(password: string, saltHex: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const salt = new Uint8Array(saltHex.match(/.{2}/g)?.map((b) => parseInt(b, 16)) || []);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptPayload(data: unknown, password: string): Promise<EncryptedEnvelope> {
  const saltArr = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(saltArr).map((b) => b.toString(16).padStart(2, '0')).join('');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveEncKey(password, saltHex);
  const enc = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(JSON.stringify(data))
  );
  const ivHex = Array.from(iv).map((b) => b.toString(16).padStart(2, '0')).join('');
  const cipherHex = Array.from(new Uint8Array(encrypted)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return { salt: saltHex, iv: ivHex, cipher: cipherHex, v: 1 };
}

export async function decryptPayload<T = unknown>(envelope: EncryptedEnvelope, password: string): Promise<T> {
  const key = await deriveEncKey(password, envelope.salt);
  const iv = new Uint8Array(envelope.iv.match(/.{2}/g)?.map((b) => parseInt(b, 16)) || []);
  const cipher = new Uint8Array(envelope.cipher.match(/.{2}/g)?.map((b) => parseInt(b, 16)) || []);
  const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return JSON.parse(new TextDecoder().decode(dec)) as T;
}

// ─── Data Collection ─────────────────────────────────────────────────────────

async function collectAllData() {
  const [
    transactions,
    budgets,
    goals,
    debts,
    bills,
    accounts,
    subscriptions,
    investments,
    challenges,
    categories,
    recurringTransactions,
  ] = await Promise.all([
    DB.getTransactions(),
    DB.getBudgets(),
    DB.getGoals(),
    DB.getDebts(),
    DB.getBills(),
    DB.getAccounts(),
    DB.getSubscriptions(),
    DB.getInvestments(),
    DB.getChallenges(),
    DB.getCategories(),
    DB.getRecurringTransactions(),
  ]);

  // Settings snapshot
  const settingKeys = [
    'baseCurrency',
    'language',
    'theme',
    'darkPalette',
    'lightPalette',
    'notifPrefs',
    'homeOrder',
    'qaOrder',
    'qaVisibility',
    'numberSystem',
    'fontSize',
    'currencyDisplayMode',
    'userPoints',
    'unlockedRewards',
    'familyMembers',
    'categoryLearningMap',
  ];
  const settings: Record<string, unknown> = {};
  for (const k of settingKeys) {
    const v = await DB.getSetting(k);
    if (v !== null && v !== undefined) settings[k] = v;
  }

  return {
    transactions,
    budgets,
    goals,
    debts,
    bills,
    accounts,
    subscriptions,
    investments,
    challenges,
    categories,
    recurringTransactions,
    settings,
    exportedAt: new Date().toISOString(),
    version: APP_VERSION,
  };
}

// ─── Upload Snapshot ─────────────────────────────────────────────────────────

export async function cloudBackup(encPassword: string): Promise<boolean> {
  const session = await getCloudSession();
  if (!session) throw new Error('not_authenticated');

  const userId = session.user?.id;
  if (!userId) throw new Error('no_user_id');

  toast(t('cloud.backingUp'), 'info');

  const allData = await collectAllData();
  const envelope = await encryptPayload(allData, encPassword);

  const payload = {
    user_id: userId,
    payload: envelope,
    backed_up_at: new Date().toISOString(),
    version: allData.version,
    record_counts: {
      transactions: allData.transactions.length,
      budgets: allData.budgets.length,
      goals: allData.goals.length,
    },
  };

  // Upsert — one backup row per user
  await sbFetch('/rest/v1/backups?on_conflict=user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(payload),
  });

  await DB.setSetting('lastCloudBackup', new Date().toISOString());
  toast(t('cloud.backupSuccess'), 'success');
  return true;
}

// ─── Download & Restore ──────────────────────────────────────────────────────

interface BackupRow {
  payload: EncryptedEnvelope;
  backed_up_at: string;
  version: string;
}

export async function cloudRestore(encPassword: string): Promise<{ backed_up_at: string; version: string }> {
  const session = await getCloudSession();
  if (!session) throw new Error('not_authenticated');

  const userId = session.user?.id;
  toast(t('cloud.restoring'), 'info');

  const rows = await sbFetch<BackupRow[]>(
    `/rest/v1/backups?user_id=eq.${userId}&select=payload,backed_up_at,version`
  );
  if (!rows || rows.length === 0) throw new Error('no_backup_found');

  const { payload: envelope, backed_up_at, version } = rows[0];

  let allData: Record<string, unknown[] | Record<string, unknown>>;
  try {
    allData = await decryptPayload<Record<string, unknown[] | Record<string, unknown>>>(envelope, encPassword);
  } catch (err) {
    throw new Error('wrong_password', { cause: err });
  }

  // Restore each store
  const stores = [
    ['transactions', 'addTransaction'],
    ['budgets', 'addBudget'],
    ['goals', 'addGoal'],
    ['debts', 'addDebt'],
    ['bills', 'addBill'],
    ['accounts', 'addAccount'],
    ['subscriptions', 'addSubscription'],
    ['investments', 'addInvestment'],
    ['challenges', 'addChallenge'],
    ['categories', 'addCategory'],
    ['recurringTransactions', 'addRecurring'],
  ] as const;

  // Clear existing data first (user confirmed before calling this)
  for (const [storeKey] of stores) {
    const dbRecord = DB as unknown as Record<string, (arg?: unknown) => Promise<unknown[]>>;
    const getFnName = `get${storeKey.charAt(0).toUpperCase() + storeKey.slice(1)}`;
    const items = (await dbRecord[getFnName]?.()) || [];
    for (const item of items) {
      const delFn = `delete${storeKey.charAt(0).toUpperCase() + storeKey.slice(1, -1)}`;
      const delFunc = dbRecord[delFn];
      if (delFunc && typeof item === 'object' && item !== null && 'id' in item) {
        await delFunc((item as { id: string }).id).catch(() => {});
      }
    }
  }

  // Re-import data
  for (const [storeKey, addFn] of stores) {
    const items = (allData[storeKey] as unknown[]) || [];
    const dbRecord = DB as unknown as Record<string, (item: unknown) => Promise<unknown>>;
    for (const item of items) {
      try {
        await dbRecord[addFn]?.(item);
      } catch (_) {
        /* Duplicate key or invalid record format in legacy backup — skip and proceed */
      }
    }
  }

  // Restore settings
  if (allData.settings && typeof allData.settings === 'object') {
    for (const [k, v] of Object.entries(allData.settings)) {
      await DB.setSetting(k, v);
    }
  }

  toast(`✅ ${t('cloud.restoreSuccess')} (${version || ''})`, 'success');
  return { backed_up_at, version };
}

// ─── Get Last Backup Info ────────────────────────────────────────────────────

export async function getCloudBackupInfo(): Promise<BackupInfo | null> {
  const session = await getCloudSession();
  if (!session) return null;
  try {
    const userId = session.user?.id;
    const rows = await sbFetch<BackupInfo[]>(
      `/rest/v1/backups?user_id=eq.${userId}&select=backed_up_at,version,record_counts`
    );
    return rows?.[0] || null;
  } catch {
    return null;
  }
}
