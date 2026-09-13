import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { timingSafeEqual } from '@/core/security/crypto';

/**
 * Regression tests for the developer-unlock backdoor (audit finding M-3).
 *
 * Background: Settings.tsx shipped a hidden "master password" dialog — tap the
 * version label seven times — which granted 99,999 points, every paid perk,
 * all 14 palettes, all 16 milestones and a ten-year AI premium entitlement.
 * It was gated on VITE_MASTER_HASH / VITE_MASTER_SALT, which Vite inlines as
 * plain string literals into the client bundle. A secret compiled into a
 * downloadable APK is not a secret: anyone could extract the hash and attack
 * it offline, and the comparison used `===`, which short-circuits on the first
 * differing byte and therefore leaks progress through timing.
 *
 * The fix is *removal*, not deactivation. Every branch of the feature is
 * wrapped in `import.meta.env.DEV`. Vite statically substitutes `false` there
 * in a production build, so the branches become dead code and are dropped by
 * tree-shaking along with the env literals. The feature only exists under
 * `npm run dev`.
 *
 * These tests guard the two properties that keep it that way. They read the
 * source rather than the bundle so the guarantee is enforced on every run
 * instead of only after a build; the build-output check
 * (`vite build && grep -r "MASTER_HASH" dist/` -> no matches) is the companion
 * acceptance check and is documented in .env.example.
 */

const settingsSource = readFileSync(
  resolve(__dirname, '../../src/features/settings/components/Settings.tsx'),
  'utf-8'
);

describe('developer unlock backdoor is compiled out of production', () => {
  it('reads the master credentials only inside an import.meta.env.DEV guard', () => {
    // Every line touching the env secrets must sit in a function that bails
    // out when not in dev. We assert the guard exists in each such function.
    const envLines = settingsSource
      .split('\n')
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(({ line }) => /VITE_MASTER_(HASH|SALT)/.test(line) && !line.trim().startsWith('//'));

    expect(envLines.length).toBeGreaterThan(0);

    for (const { line, n } of envLines) {
      // Walk back to the nearest enclosing handler and confirm it opens with
      // the DEV guard.
      const before = settingsSource.split('\n').slice(0, n).reverse();
      const guardIdx = before.findIndex((l) => /if \(!import\.meta\.env\.DEV\) return/.test(l));
      const fnIdx = before.findIndex((l) => /^\s*const \w+ = (async )?\(\) => \{/.test(l));
      expect(
        guardIdx !== -1 && (fnIdx === -1 || guardIdx < fnIdx),
        `line ${n} (${line.trim()}) is not protected by an import.meta.env.DEV guard`
      ).toBe(true);
    }
  });

  it('renders the unlock modal only when import.meta.env.DEV is true', () => {
    expect(settingsSource).toMatch(/\{import\.meta\.env\.DEV && showMasterModal && \(/);
    // No unguarded render of the modal may remain.
    expect(settingsSource).not.toMatch(/\{showMasterModal && \(/);
  });

  it('compares the derived hash in constant time, never with ===', () => {
    expect(settingsSource).toMatch(/timingSafeEqual\(inputHash, targetHash\)/);
    expect(settingsSource).not.toMatch(/inputHash ===|=== targetHash/);
  });

  it('records every unlock attempt, successful or not, to the audit log', () => {
    expect(settingsSource).toMatch(/recordAction\('DEV_UNLOCK'/);
    expect(settingsSource).toMatch(/recordAction\('DEV_UNLOCK_FAILED'/);
  });
});

describe('timingSafeEqual', () => {
  it('accepts identical strings', () => {
    expect(timingSafeEqual('a1b2c3', 'a1b2c3')).toBe(true);
    expect(timingSafeEqual('', '')).toBe(true);
  });

  it('rejects differing strings of equal length', () => {
    expect(timingSafeEqual('a1b2c3', 'a1b2c4')).toBe(false);
    // Differs only in the first character: `===` would exit immediately here,
    // which is exactly the leak this function removes.
    expect(timingSafeEqual('z1b2c3', 'a1b2c3')).toBe(false);
  });

  it('rejects strings of differing length', () => {
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
    expect(timingSafeEqual('abcd', 'abc')).toBe(false);
  });

  it('rejects non-string input instead of coercing it', () => {
    // Guards against `undefined === undefined` accidentally authenticating a
    // caller when an env var is missing.
    expect(timingSafeEqual(undefined as unknown as string, undefined as unknown as string)).toBe(false);
    expect(timingSafeEqual(null as unknown as string, 'abc')).toBe(false);
    expect(timingSafeEqual('abc', 123 as unknown as string)).toBe(false);
  });

  it('examines the whole string regardless of where the mismatch is', () => {
    // Behavioural proxy for constant time: a mismatch at position 0 and a
    // mismatch at the last position must both return false, and the
    // implementation must not short-circuit (verified by source inspection
    // below).
    const early = timingSafeEqual('Xbcdefghij', 'abcdefghij');
    const late = timingSafeEqual('abcdefghiX', 'abcdefghij');
    expect(early).toBe(false);
    expect(late).toBe(false);

    const cryptoSource = readFileSync(
      resolve(__dirname, '../../src/core/security/crypto.ts'),
      'utf-8'
    );
    const fn = cryptoSource.slice(cryptoSource.indexOf('export function timingSafeEqual'));
    // An early `return false` inside the loop would reintroduce the leak.
    expect(fn.slice(0, fn.indexOf('return diff === 0'))).not.toMatch(/for[\s\S]*return/);
  });
});
