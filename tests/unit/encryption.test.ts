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
