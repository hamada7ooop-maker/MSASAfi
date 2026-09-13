import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  _encryptRecord,
  _decryptRecord,
  applyEncryptionMiddleware
} from '@/core/db/encryption';
import {
  deriveMasterKey,
  setEncryptionKey,
  clearEncryptionKey,
  isEncryptionKeyReady,
  setEncryptionRequired
} from '@/core/security/crypto';
import { db as DB } from '@/core/db/core';
import { generateSalt } from '@/core/security';
import { initializeVaultKey } from '@/core/security/vaultKey';
import { TransactionRepository } from '@/core/db/repositories/transactions';

describe('Encryption Layer Unit Tests (encryption.ts)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const key = await deriveMasterKey('test-pin-1234', 'test-salt-abc');
    setEncryptionKey(key);
  });

  afterEach(() => {
    clearEncryptionKey();
    // Reset the "vault is encrypted" flag so a locked-vault assertion in one
    // test cannot make unrelated tests refuse their writes.
    setEncryptionRequired(false);
  });

  it('verifies master key readiness state', () => {
    expect(isEncryptionKeyReady()).toBe(true);
    clearEncryptionKey();
    expect(isEncryptionKeyReady()).toBe(false);
  });

  it('encrypts and decrypts sensitive transaction fields correctly (roundtrip)', async () => {
    const rawRecord = {
      id: 'txn_100',
      amount: 1500,
      description: 'Consulting Fee',
      category: 'Income',
      date: '2026-09-01'
    };

    const encrypted = await _encryptRecord('transactions', rawRecord);
    expect(encrypted.amount).toBeUndefined();
    expect(encrypted.description).toBeUndefined();
    expect(encrypted.category).toBe('Income');
    expect(typeof encrypted._encrypted).toBe('string');

    const decrypted = await _decryptRecord('transactions', encrypted);
    expect(decrypted.amount).toBe(1500);
    expect(decrypted.description).toBe('Consulting Fee');
    expect(decrypted.category).toBe('Income');
  });

  it('handles edge cases in _encryptRecord and _decryptRecord', async () => {
    // 1a. No PIN configured (vault not encrypted) -> plaintext is by design
    clearEncryptionKey();
    setEncryptionRequired(false);
    const plain = { id: 'txn_plain', amount: 50 };
    const notEncrypted = await _encryptRecord('transactions', plain);
    expect(notEncrypted).toEqual(plain);

    // 1b. Vault IS encrypted but currently locked -> must REFUSE the write
    // rather than silently persisting the amount in plaintext.
    setEncryptionRequired(true);
    await expect(_encryptRecord('transactions', plain)).rejects.toThrow(/app is locked/);
    // ...but a record with no sensitive fields is still allowed through.
    await expect(
      _encryptRecord('transactions', { id: 'txn_meta', type: 'income' })
    ).resolves.toEqual({ id: 'txn_meta', type: 'income' });

    const key = await deriveMasterKey('test-pin-1234', 'test-salt-abc');
    setEncryptionKey(key);

    // 2. Unknown table -> returns original
    const unknownTableRecord = await _encryptRecord('non_existent_table', plain);
    expect(unknownTableRecord).toEqual(plain);

    // 3. No sensitive fields present in record -> returns original
    const nonSensitive = { id: 'txn_empty', type: 'income', date: '2026-09-01' };
    const unchanged = await _encryptRecord('transactions', nonSensitive);
    expect(unchanged).toEqual(nonSensitive);

    // 4. Decrypt without _encrypted field -> returns original
    const noEncField = await _decryptRecord('transactions', { id: 'x' });
    expect(noEncField).toEqual({ id: 'x' });

    // 5. Decrypt when key is not ready -> returns original
    clearEncryptionKey();
    const withEnc = { id: 'y', _encrypted: 'some_base64' };
    const skippedDec = await _decryptRecord('transactions', withEnc);
    expect(skippedDec).toEqual(withEnc);
  });

  it('catches corrupted encrypted payload in _decryptRecord without throwing', async () => {
    const corrupted = { id: 'corrupt_1', _encrypted: 'invalid_base64_payload' };
    const result = await _decryptRecord('transactions', corrupted);
    expect(result).toEqual(corrupted);
  });

  it('exercises applyEncryptionMiddleware hooks (mutate, get, getMany, query, openCursor)', async () => {
    let middlewareFactory: ((downlevelDb: unknown) => { table: (name: string) => Record<string, (...args: unknown[]) => Promise<unknown>> }) | null = null;

    const mockDb = {
      use: vi.fn(({ create }) => {
        middlewareFactory = create;
      })
    };

    applyEncryptionMiddleware(mockDb as never);
    expect(mockDb.use).toHaveBeenCalled();
    expect(middlewareFactory).toBeDefined();

    // Create downlevel mock
    const downlevelDb = {
      table: vi.fn((tableName: string) => ({
        tableName,
        mutate: vi.fn(async (req) => ({ numFailures: 0, results: req.values })),
        get: vi.fn(async ({ key }) => ({ id: key, _encrypted: null, category: 'Food' })),
        getMany: vi.fn(async ({ keys }) => keys.map((k: string) => ({ id: k, category: 'Food' }))),
        query: vi.fn(async () => ({ result: [{ id: 'q1', category: 'Food' }] })),
        openCursor: vi.fn(async () => {
          let count = 0;
          return {
            value: { id: 'c1', category: 'Food' },
            continue: vi.fn(async () => {
              count++;
              return count < 2;
            }),
            continuePrimaryKey: vi.fn(async () => true)
          };
        })
      }))
    };

    const wrappedDb = middlewareFactory!(downlevelDb);
    const transactionsTable = wrappedDb.table('transactions');

    // 1. Mutate with _skipEncryption
    const mutateRes = await transactionsTable.mutate({
      type: 'add',
      values: [{ id: 't1', amount: 100, _skipEncryption: true }]
    });
    expect(mutateRes.results[0].amount).toBe(100);
    expect(mutateRes.results[0]._skipEncryption).toBeUndefined();

    // 2. Mutate with normal encryption
    const mutateEnc = await transactionsTable.mutate({
      type: 'add',
      values: [{ id: 't2', amount: 250, description: 'Secret' }]
    });
    expect(mutateEnc.results[0].amount).toBeUndefined();
    expect(mutateEnc.results[0]._encrypted).toBeDefined();

    // 3. Get
    const getRes = await transactionsTable.get({ key: 't2' });
    expect(getRes).toBeDefined();

    // 4. GetMany
    const getManyRes = await transactionsTable.getMany({ keys: ['t1', 't2'] });
    expect(getManyRes).toHaveLength(2);

    // 5. Query
    const queryRes = await transactionsTable.query({});
    expect(queryRes.result).toHaveLength(1);

    // 6. OpenCursor & Proxy
    const cursor = await transactionsTable.openCursor({});
    expect(cursor.value).toBeDefined();
    await cursor.continue();
    await cursor.continuePrimaryKey('key', 'pkey');

    // 7. Non-encrypted table bypass
    const nonEncTable = wrappedDb.table('non_encrypted_table');
    expect(nonEncTable.tableName).toBe('non_encrypted_table');
  });
});

describe('Encrypting many records inside one transaction (Dexie.waitFor)', () => {
  /**
   * Regression test for a real defect in the middleware.
   *
   * `mutate` awaits WebCrypto, which is not an IndexedDB promise. An IndexedDB
   * transaction auto-commits once its queue drains with no pending requests,
   * so awaiting a foreign promise inside one lets it close underneath the next
   * write — InvalidStateError, non-deterministically.
   *
   * Before the fix, a single encrypted write after a database wipe failed
   * 20 times out of 20 in this environment, and multi-table passes failed at
   * rates that varied with table count. `Dexie.waitFor` keeps the transaction
   * alive while the crypto settles.
   *
   * The loop matters: one write can pass by luck. This exercises the pattern
   * repeatedly, across several tables, inside an explicit transaction.
   */
  it('encrypts across several tables in one transaction, repeatedly, without InvalidStateError', async () => {
    const { db: DB } = await import('@/core/db/core');
    const { generateMasterDataKey, setEncryptionKey, clearEncryptionKey, setEncryptionRequired } =
      await import('@/core/security/crypto');

    for (let round = 0; round < 5; round++) {
      clearEncryptionKey();
      setEncryptionRequired(false);
      await DB.transaction('rw', DB.tables, async () => {
        for (const t of DB.tables) await t.clear();
      });

      // Seed in the clear, exactly as a restore onto a PIN-less device does.
      await DB.transactions.put({ id: 't1', type: 'expense', amount: 11, description: 'a' } as never);
      await DB.accounts.put({ id: 'a1', name: 'Main', balance: 22 } as never);
      await DB.goals.put({ id: 'g1', name: 'Car', targetAmount: 33, saved: 3 } as never);

      setEncryptionKey(await generateMasterDataKey());

      const tables = [DB.transactions, DB.accounts, DB.goals];
      await DB.transaction('rw', tables, async () => {
        for (const t of tables) {
          const rows = await t.toArray();
          await t.bulkPut(rows);
        }
      });

      for (const [table, id] of [['transactions', 't1'], ['accounts', 'a1'], ['goals', 'g1']] as const) {
        const row = (await DB.table(table).get(id)) as Record<string, unknown>;
        expect(row, `${table}/${id} missing in round ${round}`).toBeTruthy();
        expect(row['_encrypted'], `${table}/${id} not encrypted in round ${round}`).toBeTruthy();
      }
    }

    clearEncryptionKey();
    setEncryptionRequired(false);
  });

  /**
   * Guards the everyday path, not a synthetic one.
   *
   * The `Dexie.waitFor` regression test above covers a bulk write. This covers
   * what users actually do: add a transaction through the repository, with a
   * PIN set. `TransactionRepository.add` opens a transaction spanning
   * `transactions` + `accounts` and writes through the encryption middleware.
   *
   * Measured with the fix removed, this fails 24 times out of 25 -- i.e. a
   * user with a PIN could barely record a single expense. The defect was
   * invisible because no test had ever written to an encrypted table through
   * a repository while a key was loaded.
   */
  it('records transactions through the repository with a vault key loaded', async () => {
    await initializeVaultKey('1234', generateSalt(), /* adoptExistingKey */ false);

    // Counted as a delta: earlier tests in this file share the database, so an
    // absolute count would assert on their leftovers rather than on this path.
    const before = await DB.transactions.count();

    // Looped: a single write can pass by luck, which is how this survived.
    for (let i = 0; i < 12; i++) {
      await TransactionRepository.add({
        type: 'expense',
        amount: 10 + i,
        description: `coffee ${i}`,
      } as never);
    }

    expect((await DB.transactions.count()) - before).toBe(12);

    // ...and every row is genuinely enveloped, not merely written.
    const mine = (await DB.transactions.toArray()).filter((r) =>
      String((r as { description?: string }).description || '').startsWith('coffee ')
    );
    expect(mine).toHaveLength(12);
    expect(mine.every((r) => '_encrypted' in (r as Record<string, unknown>))).toBe(true);
    // The caller's view still decrypts correctly.
    expect(mine.some((r) => (r as { description?: string }).description === 'coffee 7')).toBe(true);
  });

  /**
   * The read side needs `Dexie.waitFor` too.
   *
   * Found by sweeping for other instances of the write-path defect rather than
   * assuming it was a one-off. `get`/`getMany`/`query`/`openCursor` all DECRYPT
   * after reading, which is equally a foreign WebCrypto promise awaited inside
   * the transaction -- so a read followed by any further request could see the
   * transaction auto-commit underneath it.
   *
   * It hid better than the write bug because it is load-dependent: measured at
   * 0-2 failures per 20 transactions across repeated runs (~5%), where the
   * write path failed 24/25. A rare failure on a READ is worse than a loud one,
   * because it surfaces as data that intermittently fails to load rather than
   * as an obvious error.
   *
   * This test therefore loops: a single pass proves nothing at a 5% rate.
   */
  it('survives repeated read-then-read cycles inside one transaction', async () => {
    await initializeVaultKey('1234', generateSalt(), /* adoptExistingKey */ false);
    for (let i = 0; i < 5; i++) {
      await DB.transactions.put({
        id: `rr${i}`, type: 'expense', amount: i, description: `d${i}`,
      } as never);
    }

    for (let round = 0; round < 20; round++) {
      await DB.transaction('rw', DB.transactions, DB.accounts, async () => {
        await DB.transactions.toArray();   // query -> decrypt (foreign await)
        await DB.accounts.toArray();       // the request that used to fail
        await DB.transactions.get('rr1');  // get -> decrypt
        await DB.accounts.toArray();
      });
    }

    // Values still round-trip: waitFor must not have changed what is returned.
    const row = (await DB.transactions.get('rr1')) as { description?: string } | undefined;
    expect(row?.description).toBe('d1');
  });
});
