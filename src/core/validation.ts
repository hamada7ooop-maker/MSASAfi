// ============================================
// مصاريفي - وحدة التحقق من المدخلات المركزية
// ISSUE-12 fix: Centralized input validation
// ============================================
import { t } from '../i18n/engine';
import { bridge } from './AppBridge';

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

export interface ValidateTextOptions {
  required?: boolean;
  maxLength?: number;
  label?: string;
}

/**
 * Validate a transaction amount input.
 */
export function validateAmount(value: string | number | null | undefined): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return { ok: false, error: t('val.amountRequired') };
  }
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (Number.isNaN(num)) return { ok: false, error: t('val.amountInvalid') };
  if (num <= 0) return { ok: false, error: t('val.amountPositive') };
  if (num > 1_000_000_000) return { ok: false, error: t('val.amountTooLarge') };
  return { ok: true };
}

/**
 * Validate a text description or name field.
 */
export function validateText(
  value: string | null | undefined,
  opts: ValidateTextOptions = {}
): ValidationResult {
  const { required = true, maxLength = 200, label } = opts;
  const fieldName = label || t('val.field');
  if (required && (!value || !value.trim())) {
    return { ok: false, error: t('val.fieldRequired', { field: fieldName }) };
  }
  if (value && value.trim().length > maxLength) {
    return { ok: false, error: t('val.fieldMax', { field: fieldName, max: String(maxLength) }) };
  }
  return { ok: true };
}

/**
 * Validate a date string — reject dates more than 10 years in the future.
 */
export function validateDate(dateStr: string | null | undefined): ValidationResult {
  if (!dateStr) return { ok: false, error: t('val.dateRequired') };
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return { ok: false, error: t('val.dateInvalid') };
  const tenYearsAhead = new Date();
  tenYearsAhead.setFullYear(tenYearsAhead.getFullYear() + 10);
  if (d > tenYearsAhead) return { ok: false, error: t('val.dateFuture') };
  const tenYearsBefore = new Date();
  tenYearsBefore.setFullYear(tenYearsBefore.getFullYear() - 10);
  if (d < tenYearsBefore) return { ok: false, error: t('val.datePast') };
  return { ok: true };
}

/**
 * Validate a budget limit.
 */
export function validateBudgetLimit(value: string | number | null | undefined): ValidationResult {
  const result = validateAmount(value);
  if (!result.ok) return result;
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (num < 1) return { ok: false, error: t('val.budgetMin') };
  return { ok: true };
}

/**
 * Validate a category name — must not be empty, duplicate check is caller's responsibility.
 */
export function validateCategoryName(name: string | null | undefined): ValidationResult {
  if (!name || !name.trim()) return { ok: false, error: t('val.catNameRequired') };
  if (name.trim().length > 50) return { ok: false, error: t('val.catNameLong') };
  if (/[<>{}[\]\\]/.test(name)) return { ok: false, error: t('val.catNameInvalid') };
  return { ok: true };
}

/**
 * Validate a goal/savings target amount (must be > current saved amount).
 */
export function validateGoalTarget(
  target: number | string | null | undefined,
  alreadySaved = 0
): ValidationResult {
  const result = validateAmount(target);
  if (!result.ok) return result;
  const num = typeof target === 'number' ? target : parseFloat(String(target));
  if (num <= alreadySaved) {
    return { ok: false, error: t('val.goalTargetGtSaved') };
  }
  return { ok: true };
}

/**
 * Show a validation error using the toast system.
 */
export function assertValid(result: ValidationResult): boolean {
  if (!result.ok) {
    if (bridge.toast) bridge.toast(result.error, 'error');
    return false;
  }
  return true;
}
