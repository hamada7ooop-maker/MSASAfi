/**
 * Masarifi — money comparison helpers.
 *
 * ## Why this exists
 *
 * Monetary amounts are stored as IEEE-754 doubles. Most values used in
 * personal finance are not exactly representable in binary floating point:
 * 0.1 + 0.2 is 0.30000000000000004, not 0.3. Every deposit, payment and
 * balance update accumulates a tiny error. Measured on this codebase, a
 * thousand sequential transactions drift by about 3.3e-11 — far too small to
 * ever show up in a formatted figure, which is why it has never been reported
 * as a display bug.
 *
 * It is not too small to break an equality or threshold test. A user who saves
 * exactly the target amount of a goal can end up with `saved` equal to
 * 4999.999999999999, so `saved >= target` is false and the goal never
 * completes: no confetti, no points, no "achieved" state, and the figure on
 * screen reads 5,000 of 5,000. The same applies to paying off the last riyal
 * of a debt. The bug is invisible, unreproducible on demand, and looks to the
 * user like the app is simply refusing to acknowledge what they did.
 *
 * ## Scope of this module
 *
 * These helpers are for **comparison at decision points**, not for arithmetic
 * everywhere. Converting the whole database to integer minor units is the
 * correct long-term fix, but it is a schema migration over twelve encrypted
 * tables and is deliberately out of scope here; see BANK_GRADE_ROADMAP.md.
 * What this module does is make the handful of places that decide "is this
 * goal complete?" and "is this debt settled?" immune to drift, which is where
 * the defect actually bites.
 *
 * The tolerance is half a minor unit (half a cent / half a halala). Anything
 * within that rounds to the same displayed amount, so treating it as equal is
 * exactly what the user sees and expects. It is roughly nine orders of
 * magnitude larger than the drift we measured, so it absorbs accumulated error
 * comfortably while still being far too small to mask a genuine shortfall —
 * the smallest real difference a user can create is one minor unit, which is
 * twice the tolerance.
 */

/**
 * Half of one minor currency unit. Two amounts closer together than this
 * always format identically, so they are the same amount as far as the user
 * is concerned.
 */
export const MONEY_EPSILON = 0.005;

/**
 * Round to 2 decimal places, correcting for float representation error.
 *
 * Uses an exponent shift (`8.165` → `"8.165e2"` → `816.5` → round → `"817e-2"`)
 * rather than multiplying by 100. Multiplication introduces its own error:
 * `8.165 * 100` is 816.4999999999999, so `Math.round(v * 100) / 100` yields
 * 8.16 instead of 8.17. Parsing through the decimal string representation
 * sidesteps that, because the shift is exact.
 *
 * An `EPSILON`-nudge variant was tried first and rejected — it fixes 1.005 but
 * still fails 8.165, because the error there is larger than Number.EPSILON.
 */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const sign = value < 0 ? -1 : 1;
  const abs = Math.abs(value);
  return sign * Number(`${Math.round(Number(`${abs}e2`))}e-2`);
}

/** True when two amounts are equal to within half a minor unit. */
export function isEqualMoney(a: number, b: number): boolean {
  return Math.abs(a - b) < MONEY_EPSILON;
}

/**
 * True when `a` is at least `b`, tolerating accumulated float drift.
 *
 * Use for "has the target been reached?" checks. A value that is short by
 * 1e-11 counts as having reached the target; one short by a full minor unit
 * does not.
 */
export function isAtLeastMoney(a: number, b: number): boolean {
  return a > b || isEqualMoney(a, b);
}

/** True when `a` is at most `b`, tolerating accumulated float drift. */
export function isAtMostMoney(a: number, b: number): boolean {
  return a < b || isEqualMoney(a, b);
}

/**
 * True when an amount is zero or less — i.e. nothing remains to pay.
 *
 * Use for debt/bill settlement checks instead of `remaining <= 0`, which
 * leaves a debt "unsettled" at a remaining balance of 7e-12.
 */
export function isSettled(remaining: number): boolean {
  return remaining < MONEY_EPSILON;
}

/**
 * Add amounts and round the result to a representable money value.
 *
 * Rounding at each accumulation stops the error compounding, so a balance
 * built from thousands of transactions stays exact rather than merely close.
 */
export function addMoney(...amounts: number[]): number {
  return roundMoney(amounts.reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0));
}

/** Subtract `b` from `a`, rounded to a representable money value. */
export function subMoney(a: number, b: number): number {
  return roundMoney(a - b);
}
