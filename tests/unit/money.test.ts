import { describe, it, expect } from 'vitest';
import {
  MONEY_EPSILON,
  roundMoney,
  isEqualMoney,
  isAtLeastMoney,
  isAtMostMoney,
  isSettled,
  addMoney,
  subMoney,
} from '@/core/money';

/**
 * Regression tests for float drift at monetary decision points.
 *
 * Amounts are IEEE-754 doubles, and most decimal money values are not exactly
 * representable in binary. Each deposit or payment adds a tiny error. The
 * amount is far too small to affect a formatted figure — around 3.3e-11 after
 * a thousand transactions on this codebase — but it is fatal to an equality or
 * threshold test.
 *
 * The user-visible symptom: someone saves the exact target of a goal, the
 * screen reads "5,000 of 5,000", and the goal refuses to complete because
 * `saved` is really 4999.999999999999. Same for the final payment on a debt.
 * Unreproducible on demand, invisible in the UI, and indistinguishable from
 * the app just being broken.
 */

describe('roundMoney', () => {
  it('rounds to two decimals', () => {
    expect(roundMoney(10.456)).toBe(10.46);
    expect(roundMoney(10.454)).toBe(10.45);
    expect(roundMoney(10)).toBe(10);
  });

  it('rounds the classic representation-error midpoints correctly', () => {
    // 1.005 is stored as 1.00499999999999989, so a naive
    // Math.round(v * 100) / 100 yields 1 instead of 1.01.
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(8.165)).toBe(8.17);
  });

  it('handles negative amounts symmetrically', () => {
    expect(roundMoney(-1.005)).toBe(-1.01);
    expect(roundMoney(-10.454)).toBe(-10.45);
  });

  it('returns 0 for non-finite input rather than propagating NaN', () => {
    expect(roundMoney(NaN)).toBe(0);
    expect(roundMoney(Infinity)).toBe(0);
  });
});

describe('addMoney / subMoney', () => {
  it('fixes the canonical 0.1 + 0.2 case', () => {
    expect(0.1 + 0.2).not.toBe(0.3); // documents the underlying problem
    expect(addMoney(0.1, 0.2)).toBe(0.3);
  });

  it('does not accumulate drift over many additions', () => {
    let naive = 0;
    let safe = 0;
    for (let i = 0; i < 1000; i++) {
      naive += 7.29;
      safe = addMoney(safe, 7.29);
    }
    expect(naive).not.toBe(7290); // the bug, reproduced
    expect(safe).toBe(7290); // the fix
  });

  it('subtracts exactly', () => {
    expect(subMoney(0.3, 0.1)).toBe(0.2);
    expect(0.3 - 0.1).not.toBe(0.2);
  });

  it('ignores non-finite terms instead of poisoning the total', () => {
    expect(addMoney(10, NaN, 5)).toBe(15);
  });
});

describe('isEqualMoney', () => {
  it('treats drifted values as equal', () => {
    expect(isEqualMoney(5000, 4999.999999999999)).toBe(true);
    expect(isEqualMoney(0.1 + 0.2, 0.3)).toBe(true);
  });

  it('still distinguishes a genuine one-minor-unit difference', () => {
    // The smallest real difference a user can create must NOT be absorbed.
    expect(isEqualMoney(5000, 4999.99)).toBe(false);
    expect(isEqualMoney(100, 100.01)).toBe(false);
  });

  it('uses a tolerance far above the drift and far below a real difference', () => {
    expect(MONEY_EPSILON).toBe(0.005);
    expect(MONEY_EPSILON).toBeGreaterThan(1e-9); // absorbs accumulated error
    expect(MONEY_EPSILON).toBeLessThan(0.01); // cannot hide one minor unit
  });
});

describe('isAtLeastMoney — goal completion', () => {
  it('completes a goal funded to exactly its target despite drift', () => {
    // A real savings plan: 100.03 reached by seven deposits of 14.29. Naive
    // accumulation stops at 100.02999999999997, so `saved >= target` is false
    // and the goal silently refuses to complete while the UI reads 100.03.
    const target = 100.03;
    let saved = 0;
    for (let i = 0; i < 7; i++) saved += 14.29;

    expect(saved >= target).toBe(false); // the bug, reproduced
    expect(isAtLeastMoney(saved, target)).toBe(true); // the fix
  });

  it('recognises a goal reached by a drift-prone sum of decimal deposits', () => {
    let saved = 0;
    for (let i = 0; i < 10; i++) saved += 0.1;
    expect(saved >= 1).toBe(false); // 0.9999999999999999 — the bug
    expect(isAtLeastMoney(saved, 1)).toBe(true); // the fix
  });

  it('does not complete a goal that is genuinely short', () => {
    expect(isAtLeastMoney(4999.99, 5000)).toBe(false);
    expect(isAtLeastMoney(4900, 5000)).toBe(false);
  });

  it('completes a goal that is over target', () => {
    expect(isAtLeastMoney(5001, 5000)).toBe(true);
  });
});

describe('isSettled — debt payoff', () => {
  it('settles a debt whose remaining balance is float residue', () => {
    // A real repayment schedule: 100.03 cleared by seven instalments of 14.29.
    // Naive accumulation lands on 100.02999999999997, leaving 2.8e-14
    // outstanding — a positive residue, so `remaining <= 0` is false and the
    // debt is never marked settled even though it is fully paid.
    const total = 100.03;
    let paid = 0;
    for (let i = 0; i < 7; i++) paid += 14.29;
    const remaining = total - paid;

    expect(remaining).toBeGreaterThan(0); // residue is genuinely positive
    expect(remaining <= 0).toBe(false); // the bug: still "unsettled"
    expect(isSettled(remaining)).toBe(true); // the fix
  });

  it('settles on an exact final payment', () => {
    expect(isSettled(0)).toBe(true);
    expect(isSettled(1000 - 1000)).toBe(true);
  });

  it('settles when overpaid', () => {
    expect(isSettled(-5)).toBe(true);
  });

  it('does not settle a debt with one minor unit left', () => {
    expect(isSettled(0.01)).toBe(false);
    expect(isSettled(50)).toBe(false);
  });
});

describe('isAtMostMoney', () => {
  it('tolerates drift at the upper bound', () => {
    expect(isAtMostMoney(1000.0000000001, 1000)).toBe(true);
    expect(isAtMostMoney(999, 1000)).toBe(true);
  });

  it('rejects a genuine overage', () => {
    expect(isAtMostMoney(1000.01, 1000)).toBe(false);
  });
});

describe('end-to-end: the scenarios that motivated this module', () => {
  it('a goal funded by 30 monthly deposits of 166.67 completes', () => {
    const target = 5000.1;
    let saved = 0;
    for (let i = 0; i < 30; i++) saved = addMoney(saved, 166.67);

    expect(saved).toBe(5000.1); // exact, thanks to rounded accumulation
    expect(isAtLeastMoney(saved, target)).toBe(true);
  });

  it('a debt cleared by 12 instalments of 83.33 plus a final 0.04 is settled', () => {
    const total = 1000;
    let paid = 0;
    for (let i = 0; i < 12; i++) paid = addMoney(paid, 83.33);
    paid = addMoney(paid, 0.04);

    expect(paid).toBe(1000);
    expect(isSettled(subMoney(total, paid))).toBe(true);
  });
});
