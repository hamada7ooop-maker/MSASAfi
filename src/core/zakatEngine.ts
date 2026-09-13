/**
 * Zakat calculation engine — the single source of truth.
 *
 * Replaces two divergent implementations that disagreed with each other
 * (ZakatCalculator.tsx used a default gold price of 500, core/ai/calculator.ts
 * used 235 and had no silver nisab at all).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * FIQH SCOPE — read before changing anything here
 * ─────────────────────────────────────────────────────────────────────────
 * The 2.5% rate (rub' al-'ushr) applies ONLY to monetary wealth: cash,
 * gold/silver, investment holdings and trade goods ('urud al-tijarah).
 *
 * It must NOT be applied to:
 *   • crops/fruit  → 5% (irrigated at cost) or 10% (rain-fed), and the
 *                    nisab is five awsuq (~653 kg), unrelated to gold.
 *   • livestock    → fixed in-kind amounts (one sheep per 40 head, …),
 *                    not a percentage at all.
 *   • real estate  → property held to live in or to rent has no zakat on
 *                    the asset itself, only on the rental income once it
 *                    is held as cash and completes its own hawl.
 *
 * These three categories are therefore EXCLUDED from the 2.5% base and
 * reported separately so the UI can tell the user they need a separate
 * ruling. This is agreed across the four Sunni schools and is not a
 * contested position.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Nisab in grams of pure (24k) gold. */
export const NISAB_GOLD_GRAMS = 85;

/** Nisab in grams of silver. */
export const NISAB_SILVER_GRAMS = 595;

/** Rate on monetary wealth: one quarter of a tenth. */
export const ZAKAT_RATE = 0.025;

/** One lunar (hijri) year in days — the hawl. */
export const HAWL_DAYS = 354;

/** Asset buckets that the 2.5% rate legitimately applies to. */
export const MONETARY_ASSET_KEYS = ['cash', 'gold', 'invest', 'trade'] as const;

/**
 * Buckets that must be assessed under different rules entirely.
 * Kept in the UI for completeness, but excluded from the 2.5% base.
 */
export const NON_MONETARY_ASSET_KEYS = ['livestock', 'crops', 'realestate'] as const;

export type MonetaryAssetKey = (typeof MONETARY_ASSET_KEYS)[number];
export type NonMonetaryAssetKey = (typeof NON_MONETARY_ASSET_KEYS)[number];

export interface ZakatInput {
  /** Value per bucket, already converted to the base currency. */
  assets: Partial<Record<MonetaryAssetKey | NonMonetaryAssetKey, number>>;
  /** Immediately-due debts, deducted from the zakatable base. */
  liabilities?: number;
  /** Price of one gram of 24k gold. */
  goldPricePerGram: number;
  /** Price of one gram of silver. */
  silverPricePerGram: number;
  /** Which metal defines the nisab threshold. */
  nisabMethod: 'gold' | 'silver';
  /** ISO date the wealth first reached nisab, if the user recorded it. */
  nisabReachedDate?: string | null;
  /** Injectable for tests. */
  now?: Date;
}

export interface ZakatResult {
  /** Monetary assets only — the 2.5% applies to this, after debts. */
  monetaryTotal: number;
  /** Sum of the three buckets that need a separate ruling. */
  excludedTotal: number;
  /** Breakdown of what was excluded and why the UI should flag it. */
  excludedBreakdown: Array<{ key: NonMonetaryAssetKey; value: number }>;
  /** Debts deducted. */
  liabilities: number;
  /** monetaryTotal − liabilities, floored at zero. */
  netZakatableBase: number;
  /** The threshold in currency. */
  nisab: number;
  isAboveNisab: boolean;
  /** Zero unless the base is at or above nisab. */
  zakatAmount: number;
  /** Hawl state — 'unknown' when the user has not recorded a date. */
  hawl: {
    status: 'unknown' | 'complete' | 'incomplete';
    daysElapsed: number | null;
    daysRemaining: number | null;
  };
  /**
   * True when zakat is genuinely due: above nisab AND the hawl is known to
   * be complete. When the hawl is unknown this stays false, so callers can
   * present the figure as an estimate rather than an obligation.
   */
  isDueNow: boolean;
}

function sum(values: Array<number | undefined>): number {
  return values.reduce<number>((acc, v) => acc + (Number(v) || 0), 0);
}

/**
 * Converts a weight of gold at a given karat to its pure-24k equivalent.
 * e.g. 100g of 21k  →  100 × 21/24  =  87.5g of pure gold.
 */
export function toPureGoldEquivalent(weightGrams: number, karat: number): number {
  const w = Number(weightGrams) || 0;
  const k = Number(karat) || 0;
  if (w <= 0 || k <= 0) return 0;
  return w * (Math.min(k, 24) / 24);
}

/**
 * Evaluates the hawl (lunar year) from the date the wealth reached nisab.
 */
export function evaluateHawl(
  nisabReachedDate?: string | null,
  now: Date = new Date()
): ZakatResult['hawl'] {
  if (!nisabReachedDate) {
    return { status: 'unknown', daysElapsed: null, daysRemaining: null };
  }

  const start = new Date(nisabReachedDate);
  if (Number.isNaN(start.getTime())) {
    return { status: 'unknown', daysElapsed: null, daysRemaining: null };
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysElapsed = Math.floor((now.getTime() - start.getTime()) / msPerDay);

  if (daysElapsed < 0) {
    // A future date cannot have completed a hawl.
    return { status: 'incomplete', daysElapsed: 0, daysRemaining: HAWL_DAYS };
  }

  if (daysElapsed >= HAWL_DAYS) {
    return { status: 'complete', daysElapsed, daysRemaining: 0 };
  }

  return {
    status: 'incomplete',
    daysElapsed,
    daysRemaining: HAWL_DAYS - daysElapsed,
  };
}

/**
 * Calculates zakat on monetary wealth.
 */
export function calculateZakat(input: ZakatInput): ZakatResult {
  const {
    assets,
    liabilities = 0,
    goldPricePerGram,
    silverPricePerGram,
    nisabMethod,
    nisabReachedDate,
    now = new Date(),
  } = input;

  const monetaryTotal = sum(MONETARY_ASSET_KEYS.map((k) => assets[k]));

  const excludedBreakdown = NON_MONETARY_ASSET_KEYS.map((key) => ({
    key,
    value: Number(assets[key]) || 0,
  })).filter((e) => e.value > 0);

  const excludedTotal = sum(excludedBreakdown.map((e) => e.value));

  const safeLiabilities = Math.max(0, Number(liabilities) || 0);
  const netZakatableBase = Math.max(0, monetaryTotal - safeLiabilities);

  const nisab =
    nisabMethod === 'silver'
      ? NISAB_SILVER_GRAMS * (Number(silverPricePerGram) || 0)
      : NISAB_GOLD_GRAMS * (Number(goldPricePerGram) || 0);

  const isAboveNisab = nisab > 0 && netZakatableBase >= nisab;
  const zakatAmount = isAboveNisab ? netZakatableBase * ZAKAT_RATE : 0;

  const hawl = evaluateHawl(nisabReachedDate, now);

  return {
    monetaryTotal,
    excludedTotal,
    excludedBreakdown,
    liabilities: safeLiabilities,
    netZakatableBase,
    nisab,
    isAboveNisab,
    zakatAmount,
    hawl,
    isDueNow: isAboveNisab && hawl.status === 'complete',
  };
}
