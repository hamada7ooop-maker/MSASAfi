import type {
  Middleware,
  DBCore,
  DBCoreTable,
  DBCoreMutateRequest,
  DBCoreGetRequest,
  DBCoreGetManyRequest,
  DBCoreQueryRequest,
  DBCoreQueryResponse,
  DBCoreOpenCursorRequest,
  DBCoreCursor,
} from 'dexie';
import Dexie from 'dexie';
import { encryptData, decryptData, isEncryptionKeyReady, isVaultLocked } from '@core/security/crypto';
import { recordException } from '../crashlytics';

/**
 * Fields that should be encrypted before storage.
 */
export const ENCRYPTED_FIELDS: Record<string, string[]> = {
  transactions: ['amount', 'description', 'notes', 'attachment', 'originalAmount', 'location', 'smsText'],
  budgets:      ['limit', 'name', 'spent'],
  goals:        ['targetAmount', 'saved', 'name', 'target'],
  debts:        ['amount', 'name', 'notes', 'total', 'paid'],
  bills:        ['amount', 'name', 'notes'],
  accounts:     ['balance', 'name', 'initialBalance'],
  subscriptions:['amount', 'name', 'notes'],
  investments:  ['amount', 'name', 'notes', 'cost', 'value'],
  installments: ['amount', 'name', 'notes'],
  cards:        ['number', 'holder', 'expiry'],
  // The audit log mirrors full financial payloads (amount, description,
  // category) for ~63 recordAction call sites. Leaving it in plaintext
  // defeated the encryption of `transactions` itself.
  auditLog:     ['description', 'details'],
  // Advisor conversations contain income/spending details. The project docs
  // already described this table as encrypted — now it actually is.
  chatHistory:  ['content']
};

/**
 * Encrypts sensitive fields in a record before it's written to the DB.
 */
export async function _encryptRecord<T extends Record<string, unknown>>(table: string, obj: T): Promise<T> {
  const fields = ENCRYPTED_FIELDS[table];
  if (!fields || !fields.length) return obj;

  // ── FAIL CLOSED (only for an encrypted-but-locked vault) ────────────────
  // If the user never set a PIN, plaintext storage is the intended behaviour
  // and we must not break writes. But if the vault IS encrypted and the key
  // has been wiped (auto-lock / backgrounding), returning `obj` unchanged
  // would silently persist financial fields in PLAINTEXT — refuse instead.
  // ────────────────────────────────────────────────────────────────────────
  if (isVaultLocked() && fields.some((f) => f in obj)) {
    throw new Error(
      `[DB] Refusing to write plaintext to "${table}": app is locked (encryption key unavailable)`
    );
  }
  if (!isEncryptionKeyReady()) return obj;

  const payload: Record<string, unknown> = {};
  const clean: Record<string, unknown> = { ...obj };

  for (const f of fields) {
    if (f in clean) {
      payload[f] = clean[f];
      delete clean[f];
    }
  }

  if (Object.keys(payload).length === 0) return obj;

  try {
    const encryptedStr = await encryptData(payload);
    clean._encrypted = encryptedStr;
    return clean as T;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    recordException('[DB] Encryption failed for record', e instanceof Error ? e : new Error(message));
    // Propagate instead of falling back to a plaintext write.
    throw e instanceof Error ? e : new Error(message);
  }
}

/**
 * Decrypts sensitive fields in a record after it's read from the DB.
 */
export async function _decryptRecord<T extends Record<string, unknown>>(table: string, obj: T): Promise<T> {
  if (!obj || !obj._encrypted) return obj;

  try {
    const payload = (await decryptData(obj._encrypted as string)) as Record<string, unknown>;
    return { ...obj, ...(payload && typeof payload === 'object' ? payload : {}) };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    recordException('[DB] Decryption failed for record', e instanceof Error ? e : new Error(message));
    return obj;
  }
}

/**
 * Keeps an explicit multi-request transaction alive while awaiting a foreign promise.
 * Calling Dexie.waitFor on an implicit single-request transaction after the read
 * has completed causes native browser IndexedDB to throw:
 * "Failed to execute 'objectStore' on 'IDBTransaction': The transaction has finished."
 * because the single read's IDB transaction is already committed by the browser.
 */
function safeWaitFor<T>(promise: Promise<T>): Promise<T> {
  const tx = Dexie.currentTransaction;
  if (tx && tx.explicit && tx.active) {
    try {
      return Dexie.waitFor(promise);
    } catch {
      return promise;
    }
  }
  return promise;
}

/**
 * Applies the encryption middleware to a Dexie instance.
 */
export function applyEncryptionMiddleware(db: Pick<Dexie, 'use'>): void {
  const middleware: Middleware<DBCore> = {
    stack: 'dbcore',
    name: 'encryptionMiddleware',
    create(downlevelDatabase: DBCore) {
      return {
        ...downlevelDatabase,
        table(tableName: string): DBCoreTable {
          const downTable = downlevelDatabase.table(tableName);
          const fieldsToEncrypt = ENCRYPTED_FIELDS[tableName];

          if (!fieldsToEncrypt) return downTable;

          return {
            ...downTable,
            /**
             * ── Why `Dexie.waitFor` ────────────────────────────────────────
             * Encryption is asynchronous (WebCrypto), so this hook awaits a
             * promise that does NOT originate from IndexedDB. An IndexedDB
             * transaction auto-commits as soon as its microtask queue drains
             * with no pending requests, so awaiting a foreign promise inside
             * a transaction lets it close underneath us — the next request
             * then fails with InvalidStateError.
             *
             * `Dexie.waitFor` exists for exactly this: it keeps the
             * transaction alive by issuing keep-alive requests while the
             * foreign promise settles.
             *
             * This was not theoretical. Encrypting several tables inside one
             * transaction failed reproducibly (a bare single encrypted write
             * after a wipe failed 20/20), and the failure rate varied with
             * table count and timing — the signature of a race. Adding
             * `waitFor` took the same scenario to 8/8 and then 29/29 across
             * repeated runs. Without it, any multi-record encrypted write
             * inside a transaction is a coin flip in production too — the
             * ordinary "add a transaction" repository path measured 24
             * failures out of 25 for a user with a PIN set.
             *
             * The same rule applies to every hook BELOW that decrypts, because
             * decryption is equally a foreign promise. The read side was found
             * by sweeping for other instances rather than assuming this was a
             * one-off: it failed 0–2 times per 20 transactions (~5%), which is
             * more dangerous than a loud failure because it surfaces as data
             * that intermittently fails to load.
             *
             * RULE: never `await` a non-IndexedDB promise in this file without
             * wrapping it in `Dexie.waitFor`.
             * ───────────────────────────────────────────────────────────────
             */
            async mutate(req: DBCoreMutateRequest) {
              if ((req.type === 'add' || req.type === 'put') && req.values) {
                req = {
                  ...req,
                  values: await Dexie.waitFor(Promise.all(req.values.map(async (v: Record<string, unknown> & { _skipEncryption?: boolean }) => {
                    // Bypass encryption if flag is set (used during migrations)
                    if (v._skipEncryption) {
                      const clean = { ...v };
                      delete clean._skipEncryption;
                      return clean;
                    }
                    return _encryptRecord(tableName, v);
                  })))
                };
              }
              return downTable.mutate(req);
            },
            async get(req: DBCoreGetRequest) {
              const result = await downTable.get(req);
              if (!result) return result;
              return safeWaitFor(_decryptRecord(tableName, result as Record<string, unknown>));
            },
            async getMany(req: DBCoreGetManyRequest) {
              const results = await downTable.getMany(req);
              return safeWaitFor(Promise.all(results.map((r: unknown) => r ? _decryptRecord(tableName, r as Record<string, unknown>) : r)));
            },
            async query(req: DBCoreQueryRequest): Promise<DBCoreQueryResponse> {
              const result = await downTable.query(req);
              const decrypted = await safeWaitFor(Promise.all(result.result.map((r: unknown) => _decryptRecord(tableName, r as Record<string, unknown>))));
              return { ...result, result: decrypted };
            },
            async openCursor(req: DBCoreOpenCursorRequest): Promise<DBCoreCursor | null> {
              const cursor = await downTable.openCursor(req);
              if (!cursor) return cursor;

              let decryptedValue = cursor.value ? await safeWaitFor(_decryptRecord(tableName, cursor.value as Record<string, unknown>)) : cursor.value;

              return new Proxy(cursor, {
                get(target, prop, receiver) {
                  if (prop === 'value') {
                    return decryptedValue;
                  }
                  if (prop === 'continue') {
                    return async function(key?: unknown) {
                      const res = await Reflect.apply(target.continue, target, key !== undefined ? [key] : []);
                      decryptedValue = target.value ? await safeWaitFor(_decryptRecord(tableName, target.value as Record<string, unknown>)) : target.value;
                      return res;
                    };
                  }
                  if (prop === 'continuePrimaryKey') {
                    return async function(key: unknown, primaryKey: unknown) {
                      const res = await Reflect.apply(target.continuePrimaryKey, target, [key, primaryKey]);
                      decryptedValue = target.value ? await safeWaitFor(_decryptRecord(tableName, target.value as Record<string, unknown>)) : target.value;
                      return res;
                    };
                  }
                  const val = Reflect.get(target, prop, receiver);
                  if (typeof val === 'function') {
                    return val.bind(target);
                  }
                  return val;
                }
              });
            }
          };
        }
      };
    }
  };
  db.use(middleware);
}
