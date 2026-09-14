import { normalizeArabicDigits } from '../../core/utils';

/**
 * Input formatters for card entry fields.
 *
 * Extracted from AddCardModal.tsx during the L-1 split. These are pure string
 * transforms with no React involvement, which makes them directly unit
 * testable — previously the only way to exercise the expiry-clamping rules was
 * to mount the whole sheet and type into it.
 *
 * Every one normalises Arabic-Indic digits first: the app ships an Arabic
 * keyboard layout, so a user can genuinely type ٤١١١ into a card field and it
 * must be understood as 4111.
 */

/** Groups a PAN into `1234 5678 9012 3456`, capped at 16 digits. */
export function formatCardNumber(value: string): { formatted: string; cleaned: string } {
  const cleaned = normalizeArabicDigits(value).replace(/\D/g, '').substring(0, 16);
  return { formatted: cleaned.replace(/(\d{4})(?=\d)/g, '$1 '), cleaned };
}

/**
 * Formats an expiry as `MM/YY`, clamping an impossible month.
 *
 * A month above 12 becomes 12 and a typed `00` becomes `01`, so the field
 * cannot hold a date that will be rejected later. Correcting as the user types
 * is friendlier than accepting it and failing on save.
 */
export function formatExpiry(value: string): string {
  const cleaned = normalizeArabicDigits(value).replace(/\D/g, '').substring(0, 4);
  if (cleaned.length < 2) return cleaned;

  const month = cleaned.substring(0, 2);
  const year = cleaned.substring(2, 4);
  const monthValue = parseInt(month, 10);
  const corrected =
    monthValue > 12 ? '12' : monthValue === 0 && month.length === 2 ? '01' : month;
  return `${corrected}/${year}`;
}

/** Digits only, capped at the three-digit CVV length. */
export function formatCvv(value: string): string {
  return normalizeArabicDigits(value).replace(/\D/g, '').substring(0, 3);
}
