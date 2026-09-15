/**
 * Directive 19 — closing addendum: §5.1 rules 3 & 5 as static pins.
 *
 * Rule 3 — the long screens skip off-screen rendering (cv-item) and their
 * in-flow cards get layout+paint containment (contain-card). Rule 5 —
 * `will-change` is prescription-only, and the current prescription is ZERO:
 * the one standing copy (on .card-stable) was removed because translateZ(0)
 * already promotes that layer. These scans make both rules enforce
 * themselves at CI time instead of at PR review.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const css = readFileSync(join(root, 'src/index.css'), 'utf-8');

const read = (p: string): string => readFileSync(join(root, p), 'utf-8');

/** Every line of a source file that mentions a class, one string per line. */
const linesWith = (src: string, needle: string): string[] =>
  src.split('\n').filter((l) => l.includes(needle));

/** Recursively collect file paths under dir with a matching extension. */
const walk = (dir: string, exts: string[]): string[] => {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p, exts));
    else if (exts.some((e) => name.endsWith(e))) out.push(p);
  }
  return out;
};

describe('§5.1 rule 3 — the long-list utilities exist in index.css', () => {
  it('cv-item skips off-screen entries and estimates row height (auto 84px)', () => {
    const block = css.match(/\.cv-item\s*\{[^}]*\}/)?.[0] ?? '';
    expect(block).toContain('content-visibility: auto');
    expect(block).toContain('contain-intrinsic-size: auto 84px');
  });

  it('cv-item-lg is the tall-card variant (auto 176px)', () => {
    const block = css.match(/\.cv-item-lg\s*\{[^}]*\}/)?.[0] ?? '';
    expect(block).toContain('content-visibility: auto');
    expect(block).toContain('contain-intrinsic-size: auto 176px');
  });

  it('contain-card pins layout+paint containment', () => {
    const block = css.match(/\.contain-card\s*\{[^}]*\}/)?.[0] ?? '';
    expect(block).toContain('contain: layout paint');
  });
});

describe('§5.1 rule 3 — every long screen renders its entries as cv-items', () => {
  const targets: [string, number][] = [
    // [file, minimum cv-item lines] — rows use cv-item, tall cards cv-item-lg.
    ['src/features/transactions/components/TransactionItem.tsx', 1],
    ['src/features/recurring/components/RecurringTransactions.tsx', 2],
    ['src/features/audit/components/AuditLog.tsx', 1],
    ['src/features/debts/components/InstallmentsCard.tsx', 1],
    ['src/features/settings/components/cards/AutoClassificationCard.tsx', 1],
    ['src/features/glossary/components/Glossary.tsx', 1],
  ];

  it.each(targets)('%s carries at least %i cv-item line(s)', (file, min) => {
    const src = read(file);
    const rows = [
      ...linesWith(src, 'cv-item '),
      ...linesWith(src, 'cv-item"'),
      ...linesWith(src, 'cv-item-lg'),
    ];
    expect(rows.length).toBeGreaterThanOrEqual(min);
  });

  it('no virtualized list item is also a glass surface (blur budget applies per item)', () => {
    // A list of N glass items is N backdrop-filter layers — the exact
    // blowout the ≤3-visible-surfaces budget exists to prevent.
    for (const [file] of targets) {
      const src = read(file);
      const itemLines = [
        ...linesWith(src, 'cv-item '),
        ...linesWith(src, 'cv-item"'),
        ...linesWith(src, 'cv-item-lg'),
      ];
      for (const line of itemLines) {
        expect(line, `${file}: cv-item line must not carry backdrop-blur`).not.toContain(
          'backdrop-blur'
        );
      }
    }
  });
});

describe('§5.1 rule 2 — the fixed screens keep their glass budget', () => {
  it('AuditLog carries no glass at all (its only blur was the per-entry one)', () => {
    expect(read('src/features/audit/components/AuditLog.tsx')).not.toContain('backdrop-blur');
  });

  it('RecurringTransactions glass lives only on its static chrome (4 surfaces)', () => {
    const count = linesWith(read('src/features/recurring/components/RecurringTransactions.tsx'), 'backdrop-blur').length;
    expect(count).toBe(4);
  });

  it('InstallmentsCard keeps a single glass surface (the static summary)', () => {
    const count = linesWith(read('src/features/debts/components/InstallmentsCard.tsx'), 'backdrop-blur').length;
    expect(count).toBe(1);
  });

  it('AutoClassificationCard glass is only the modal shell + rule rows are solid (8 surfaces)', () => {
    const count = linesWith(read('src/features/settings/components/cards/AutoClassificationCard.tsx'), 'backdrop-blur').length;
    expect(count).toBe(8);
  });
});

describe('§5.1 rule 5 — will-change is prescription-only, current prescription: zero', () => {
  it('no will-change declaration stands anywhere in src', () => {
    // Matches the CSS property (`will-change:`) and Tailwind's utility
    // (`will-change-transform`, `will-change-[transform]`) but not prose
    // comments that explain the rule.
    const pattern = /will-change[-:[\]]/;
    const offenders: string[] = [];
    for (const p of walk(join(root, 'src'), ['.css', '.ts', '.tsx'])) {
      if (pattern.test(readFileSync(p, 'utf-8'))) offenders.push(p);
    }
    expect(offenders).toEqual([]);
  });
});
