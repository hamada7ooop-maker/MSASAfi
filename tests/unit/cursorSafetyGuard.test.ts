import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { ENCRYPTED_FIELDS } from '@/core/db/encryption';

/**
 * Directive 6B — forbid cursor reads on encrypted Dexie tables.
 *
 * ## The failure this prevents
 *
 * Dexie's `Table.filter()` and `Table.each()` walk a cursor. The encryption
 * middleware cannot decrypt inside the cursor protocol: WebCrypto is
 * asynchronous and a cursor's `value` getter must return the record itself,
 * not a promise. Rows read that way therefore keep their `_encrypted`
 * envelope, so `row.amount` is `undefined` and every figure derived from it
 * silently becomes zero.
 *
 * That is exactly what happened in `TravelBudget`, which filtered transactions
 * by `tripId` and would have shown every trip at zero spending for any user
 * with a PIN set. It produced no error, no warning and no crash -- only wrong
 * money on screen.
 *
 * ## Why a source scan rather than an ESLint rule
 *
 * The dangerous property is *which table* the call is made on, and that is
 * decided by `ENCRYPTED_FIELDS` at runtime. A lint rule would need its own
 * hard-coded copy of that list, which would drift the first time a table is
 * encrypted. Deriving the table names from the real export means this guard
 * updates itself: encrypt `chatHistory` tomorrow and any cursor read on it
 * starts failing here immediately.
 *
 * ## The sanctioned alternative
 *
 * `await db.<table>.toArray()` and then filter in JavaScript. `toArray()` goes
 * through `query`, which decrypts.
 */

const SRC_ROOT = join(process.cwd(), 'src');

/** Files that legitimately contain the pattern: the middleware and this guard. */
const ALLOWLIST = [
  join('src', 'core', 'db', 'encryption.ts'),
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe('Directive 6B — cursor safety on encrypted tables', () => {
  const encryptedTables = Object.keys(ENCRYPTED_FIELDS);

  it('knows which tables carry encrypted fields', () => {
    // Guards the guard: if this export were ever emptied or renamed, the scan
    // below would pass vacuously and protect nothing.
    expect(encryptedTables.length).toBeGreaterThan(5);
    expect(encryptedTables).toContain('transactions');
  });

  it('no source file calls Table.filter() or Table.each() on an encrypted table', () => {
    const files = walk(SRC_ROOT).filter(
      (f) => !ALLOWLIST.some((a) => f.endsWith(a))
    );

    // `db.transactions.filter(` / `DB.cards.each(` and the same split across
    // lines, which is how the TravelBudget call site was actually written.
    const pattern = new RegExp(
      String.raw`\b(?:db|DB)\s*\.\s*(${encryptedTables.join('|')})\s*\.\s*(filter|each)\s*\(`,
      'g'
    );

    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      // Collapse whitespace so a call broken across lines is still caught.
      const flat = src.replace(/\s+/g, ' ');
      let m: RegExpExecArray | null;
      const re = new RegExp(pattern.source, 'g');
      while ((m = re.exec(flat)) !== null) {
        offenders.push(`${file.replace(process.cwd() + '/', '')}: .${m[1]}.${m[2]}(`);
      }
    }

    expect(
      offenders,
      offenders.length
        ? `Cursor reads skip decryption and return enveloped rows, so numeric ` +
          `fields read as undefined and totals silently become zero. Use ` +
          `\`await db.<table>.toArray()\` and filter in JavaScript instead.\n` +
          offenders.map((o) => `  - ${o}`).join('\n')
        : undefined
    ).toEqual([]);
  });

  it('detects the pattern it claims to detect', () => {
    // A guard that cannot fire is worse than none: it grants false confidence.
    // This proves the regex matches the exact shape that caused the defect,
    // including the multi-line form used in TravelBudget.
    const sample = `
      const expenses = await db.transactions
        .filter(tx => tx.tripId !== undefined)
        .toArray();
      await DB.cards.each(c => { void c; });
      const ok = (await db.transactions.toArray()).filter(t => t.id);
    `;
    const re = new RegExp(
      String.raw`\b(?:db|DB)\s*\.\s*(${encryptedTables.join('|')})\s*\.\s*(filter|each)\s*\(`,
      'g'
    );
    const hits = sample.replace(/\s+/g, ' ').match(re) || [];
    expect(hits).toHaveLength(2);
    // ...and it does NOT flag the sanctioned `toArray()`-then-filter form.
    expect(hits.join(' ')).not.toContain('toArray');
  });
});
