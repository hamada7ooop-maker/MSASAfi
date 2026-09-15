import React from 'react';

/**
 * Directive 19 — UI/UX Renaissance: NumberText (Batch 0: Enablement).
 *
 * THE financial figure primitive. Every amount, balance, and counter in the
 * app renders through it, buying three guarantees:
 *
 * 1. tabular-nums — figures are fixed-width, so live-updating balances never
 *    "dance" horizontally while counting.
 * 2. One font family and tight tracking — consistent optical identity for
 *    money across every screen.
 * 3. Non-finite values render as an em dash instead of "NaN"/"∞" reaching a
 *    user's balance sheet.
 *
 * The animation layer (NumberFlow, Batch 1) builds on top of this contract.
 */
export interface NumberTextProps {
  value: number;
  /**
   * Formatter for the value. Defaults to locale-aware grouping with up to
   * 2 fraction digits. Call sites with currency/decimal-settings awareness
   * pass their own (e.g. the shared formatAmount helper).
   */
  format?: (value: number) => string;
  className?: string;
  /** Accessible hover tooltip; defaults to the formatted figure. */
  title?: string;
  'data-testid'?: string;
}

const defaultFormat = (value: number): string =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);

const FALLBACK = '—';

export function NumberText({
  value,
  format = defaultFormat,
  className = '',
  title,
  'data-testid': dataTestId,
}: NumberTextProps): React.ReactElement {
  const text = Number.isFinite(value) ? format(value) : FALLBACK;
  return (
    <span
      className={`num-fin ${className}`.trim()}
      title={title ?? text}
      data-testid={dataTestId}
    >
      {text}
    </span>
  );
}

export default NumberText;
