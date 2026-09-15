import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db as DB } from '../../src/core/db/core';
import { APP_VERSION } from '../../src/core/constants';
import {
  cloudSignIn,
  cloudSignOut,
  cloudRefreshSession,
  clearCloudSession,
  getCloudSession,
  encryptPayload,
  decryptPayload,
  cloudBackup,
  cloudRestore,
  getCloudBackupInfo,
  type CloudSession,
  type EncryptedEnvelope,
} from '../../src/core/cloud';

/**
 * Directive 19 — the coverage ladder's bottom rung: cloud.ts, the E2E
 * encrypted sync service, sat at 3.4% lines. A bug here is not a cosmetic
 * regression — it is a backup that cannot be restored, or a restore that
 * resurrects deleted rows. These tests exercise the REAL crypto (PBKDF2
 * 600k → AES-GCM, the same path DevUnlockModal's suite proved viable) and
 * the REAL database (fake-indexeddb); only the network edge (global fetch)
 * and the secure session store are mocked — the seams where the app ends
 * and the platform begins.
 *
 * The strongest assertions decrypt what the backup actually uploaded:
 * the round-trip DB → collectAllData → encryptPayload → POST body →
 * decryptPayload must return the user's rows byte-faithfully, and restore
 * must clear-then-reimport without resurrecting stale rows.
 */

const h = vi.hoisted(() => ({ store: new Map<string, string>() }));

vi.mock('../../src/core/secureStore', () => ({
  secureGet: vi.fn(async (k: string) => h.store.get(k) ?? null),
  secureSet: vi.fn(async (k: string, v: string) => { h.store.set(k, v); }),
  secureRemove: vi.fn(async (k: string) => { h.store.delete(k); }),
}));

vi.mock('../../src/toast', () => ({
  toast: vi.fn(),
  confirmSheet: vi.fn(),
}));

import { toast } from '../../src/toast';

const PROXY = 'http://localhost:3000/supabase';

/** A fetch Response stand-in — plain object, no environment dependence. */
const res = (ok: boolean, status: number, body: string) =>
  ({ ok, status, text: async () => body }) as unknown as Response;

const jsonRes = (data: unknown, status = 200) =>
  res(status === 200, status, JSON.stringify(data));

const fetchMock = vi.fn();

const SESSION: CloudSession = {
  access_token: 'at_test_123',
  refresh_token: 'rt_test_456',
  user: { id: 'user-1', email: 'a@b.c' },
  expires_at: Math.floor(Date.now() / 1000) + 3600,
};

async function wipe() {
  await DB.transaction('rw', DB.tables, async () => {
    for (const t of DB.tables) await t.clear();
  });
  h.store.clear();
  fetchMock.mockReset();
  vi.mocked(toast).mockClear();
  vi.stubGlobal('fetch', fetchMock);
}

/** Store a session directly, as cloudSignIn's saveCloudSession would have —
 *  the STORED format carries expires_at in MILLISECONDS (seconds × 1000). */
const storeSession = (session: CloudSession) =>
  h.store.set(
    'masarifi_cloud_session',
    JSON.stringify({
      ...session,
      expires_at: session.expires_at && session.expires_at < 1e12
        ? session.expires_at * 1000 // seconds → ms, same as saveCloudSession
        : session.expires_at ?? Date.now() + 3600_000,
    })
  );

const SEED_TX = {
  id: 'tx_cloud_1',
  amount: 250,
  type: 'expense' as const,
  date: '2026-03-02',
  description: 'قهوة المطار',
  category: 'food',
};

describe('cloud.ts — E2E envelope (real crypto)', () => {
  beforeEach(wipe);
  afterEach(() => vi.unstubAllGlobals());

  it('encrypt → decrypt round-trips an arbitrary payload faithfully', async () => {
    const payload = {
      transactions: [{ id: 't1', description: 'رحلة عمرة', amount: 4200 }],
      settings: { language: 'ar', nested: { deep: [1, 2, 3] } },
    };
    const envelope = await encryptPayload(payload, 'كلمة السر');
    const decrypted = await decryptPayload<typeof payload>(envelope, 'كلمة السر');
    expect(decrypted).toEqual(payload);
  });

  it('the envelope carries hex salt (16B), iv (12B) and version 1', async () => {
    const envelope = await encryptPayload({ a: 1 }, 'pw');
    expect(envelope.salt).toMatch(/^[0-9a-f]{32}$/);
    expect(envelope.iv).toMatch(/^[0-9a-f]{24}$/);
    expect(envelope.cipher.length).toBeGreaterThan(0);
    expect(envelope.v).toBe(1);
  });

  it('every encryption draws a fresh salt and iv (no deterministic reuse)', async () => {
    const a = await encryptPayload({ x: 1 }, 'pw');
    const b = await encryptPayload({ x: 1 }, 'pw');
    expect(a.salt).not.toBe(b.salt);
    expect(a.iv).not.toBe(b.iv);
  });

  it('a wrong password cannot decrypt — AES-GCM integrity rejects it', async () => {
    const envelope = await encryptPayload({ secret: 'مال' }, 'right');
    await expect(decryptPayload(envelope, 'wrong')).rejects.toThrow();
  });
});

describe('cloud.ts — session lifecycle', () => {
  beforeEach(wipe);
  afterEach(() => vi.unstubAllGlobals());

  it('no stored session reads as null', async () => {
    expect(await getCloudSession()).toBeNull();
  });

  it('cloudSignIn posts credentials, persists the session, and converts expiry to ms', async () => {
    fetchMock.mockResolvedValueOnce(jsonRes(SESSION));
    const session = await cloudSignIn('a@b.c', 'hunter2');

    expect(session.access_token).toBe('at_test_123');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${PROXY}/auth/v1/token?grant_type=password`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.c', password: 'hunter2' });

    const stored = await getCloudSession();
    expect(stored?.access_token).toBe('at_test_123');
    // seconds → ms: stored expiry is ~now + 1h in milliseconds
    expect(stored?.expires_at as number).toBeGreaterThan(Date.now() + 3000_000);
  });

  it('an expired session is treated as absent and removed from the store', async () => {
    storeSession({ access_token: 'old', expires_at: Date.now() - 1000 });
    expect(await getCloudSession()).toBeNull();
    expect(h.store.has('masarifi_cloud_session')).toBe(false);
  });

  it('clearCloudSession wipes the stored session', async () => {
    storeSession(SESSION);
    await clearCloudSession();
    expect(await getCloudSession()).toBeNull();
  });

  it('refresh without a refresh token returns null without touching the network', async () => {
    storeSession({ access_token: 'at', user: { id: 'u' } });
    expect(await cloudRefreshSession()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a failed refresh clears the session and returns null (3 attempts, backoff)', async () => {
    vi.useFakeTimers();
    try {
      storeSession(SESSION);
      fetchMock.mockResolvedValue(res(false, 500, 'down'));
      const attempt = cloudRefreshSession();
      const outcome = attempt.then((v) => ({ v }), (e) => ({ e }));
      await vi.runAllTimersAsync();
      const { v } = await outcome;
      expect(v).toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(await getCloudSession()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('signOut clears the session even when the network call fails', async () => {
    vi.useFakeTimers();
    try {
      storeSession(SESSION);
      fetchMock.mockResolvedValue(res(false, 503, 'down'));
      const attempt = cloudSignOut();
      const outcome = attempt.then(() => 'ok', (e) => e);
      await vi.runAllTimersAsync();
      expect(await outcome).toBe('ok');
      expect(await getCloudSession()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('cloud.ts — sbFetch retry semantics (through cloudSignIn)', () => {
  beforeEach(wipe);
  afterEach(() => vi.unstubAllGlobals());

  it('recovers on the second attempt after a 5xx', async () => {
    vi.useFakeTimers();
    try {
      fetchMock
        .mockResolvedValueOnce(res(false, 502, 'bad gateway'))
        .mockResolvedValueOnce(jsonRes(SESSION));
      const attempt = cloudSignIn('a@b.c', 'pw');
      const outcome = attempt.then((s) => s, (e) => e);
      await vi.runAllTimersAsync();
      const session = await outcome as CloudSession;
      expect(session.access_token).toBe('at_test_123');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('gives up after 3 attempts and surfaces the last error with its status', async () => {
    vi.useFakeTimers();
    try {
      fetchMock.mockResolvedValue(res(false, 500, 'nope'));
      const attempt = cloudSignIn('a@b.c', 'pw');
      const outcome = attempt.then((s) => s, (e) => e);
      await vi.runAllTimersAsync();
      const error = await outcome as Error;
      expect(error.message).toContain('500');
      expect(fetchMock).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('cloud.ts — cloudBackup (DB → envelope → POST)', () => {
  beforeEach(wipe);
  afterEach(() => vi.unstubAllGlobals());

  it('refuses to back up without a session', async () => {
    await expect(cloudBackup('pw')).rejects.toThrow('not_authenticated');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses to back up when the session has no user id', async () => {
    storeSession({ access_token: 'at' });
    await expect(cloudBackup('pw')).rejects.toThrow('no_user_id');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uploads an envelope that decrypts back to the database, byte-faithfully', async () => {
    await DB.transactions.put(SEED_TX as never);
    await DB.budgets.put({ id: 'bg_1', name: 'رمضان', amount: 1000 } as never);
    storeSession(SESSION);
    fetchMock.mockResolvedValueOnce(jsonRes(null)); // upsert returns empty body

    expect(await cloudBackup('سرّي-123')).toBe(true);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${PROXY}/rest/v1/backups?on_conflict=user_id`);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Prefer).toBe('resolution=merge-duplicates');

    const body = JSON.parse(init.body as string);
    expect(body.user_id).toBe('user-1');
    expect(body.record_counts).toMatchObject({ transactions: 1, budgets: 1 });

    // The E2E promise: what went up comes back down intact.
    const decrypted = await decryptPayload<{
      transactions: typeof SEED_TX[];
      version: string;
      exportedAt: string;
    }>(body.payload as EncryptedEnvelope, 'سرّي-123');
    expect(decrypted.transactions).toHaveLength(1);
    expect(decrypted.transactions[0].id).toBe('tx_cloud_1');
    expect(decrypted.transactions[0].description).toBe('قهوة المطار');
    expect(decrypted.version).toBe(APP_VERSION);
    expect(decrypted.exportedAt).toBeTruthy();

    // The backup timestamp is recorded for the UI.
    expect(await DB.getSetting('lastCloudBackup')).toBeTruthy();
    // backingUp info → success
    const toastTypes = vi.mocked(toast).mock.calls.map(([, type]) => type);
    expect(toastTypes).toEqual(['info', 'success']);
  });
});

describe('cloud.ts — cloudRestore (GET → decrypt → clear → reimport)', () => {
  beforeEach(wipe);
  afterEach(() => vi.unstubAllGlobals());

  const BACKUP_DATA = {
    transactions: [{ ...SEED_TX, id: 'tx_restored_1', description: 'عشاء الرياض' }],
    budgets: [],
    goals: [],
    debts: [],
    bills: [],
    accounts: [],
    subscriptions: [],
    investments: [],
    challenges: [],
    categories: [],
    recurringTransactions: [],
    settings: { baseCurrency: 'EUR' },
    exportedAt: '2026-01-01T00:00:00.000Z',
    version: '23.3.2',
  };

  const backupRow = async (password: string) => {
    const envelope = await encryptPayload(BACKUP_DATA, password);
    return [{ payload: envelope, backed_up_at: '2026-01-02T03:04:05.000Z', version: '23.3.2' }];
  };

  it('refuses to restore without a session', async () => {
    await expect(cloudRestore('pw')).rejects.toThrow('not_authenticated');
  });

  it('says no_backup_found when the cloud has no row for the user', async () => {
    storeSession(SESSION);
    fetchMock.mockResolvedValueOnce(jsonRes([]));
    await expect(cloudRestore('pw')).rejects.toThrow('no_backup_found');
  });

  it('a wrong password is reported as wrong_password, not a crypto crash', async () => {
    storeSession(SESSION);
    fetchMock.mockResolvedValueOnce(jsonRes(await backupRow('الصحيحة')));
    await expect(cloudRestore('الخاطئة')).rejects.toThrow('wrong_password');
  });

  it('clears stale rows, reimports the backup, restores settings, and reports the row info', async () => {
    // A stale local row that must NOT survive the restore.
    await DB.transactions.put({ ...SEED_TX, id: 'tx_stale_1', description: 'قديمة' } as never);
    storeSession(SESSION);
    fetchMock.mockResolvedValueOnce(jsonRes(await backupRow('سرّي-123')));

    const info = await cloudRestore('سرّي-123');
    expect(info).toEqual({ backed_up_at: '2026-01-02T03:04:05.000Z', version: '23.3.2' });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('/rest/v1/backups?user_id=eq.user-1');

    const rows = await DB.transactions.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('tx_restored_1');
    expect(rows[0].description).toBe('عشاء الرياض');
    expect(await DB.getSetting('baseCurrency')).toBe('EUR');
  });
});

describe('cloud.ts — getCloudBackupInfo', () => {
  beforeEach(wipe);
  afterEach(() => vi.unstubAllGlobals());

  it('returns null without a session (no network call)', async () => {
    expect(await getCloudBackupInfo()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns the first row when one exists', async () => {
    storeSession(SESSION);
    fetchMock.mockResolvedValueOnce(
      jsonRes([{ backed_up_at: '2026-02-02T00:00:00Z', version: '23.3.3', record_counts: { transactions: 7 } }])
    );
    expect(await getCloudBackupInfo()).toEqual({
      backed_up_at: '2026-02-02T00:00:00Z',
      version: '23.3.3',
      record_counts: { transactions: 7 },
    });
  });

  it('a network failure reads as "no info", never as a crash', async () => {
    vi.useFakeTimers();
    try {
      storeSession(SESSION);
      fetchMock.mockResolvedValue(res(false, 500, 'down'));
      const attempt = getCloudBackupInfo();
      const outcome = attempt.then((v) => v, (e) => e);
      await vi.runAllTimersAsync();
      expect(await outcome).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
