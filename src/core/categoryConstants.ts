/** Canonical category names stored in DB / used by classifiers (Arabic labels). */
const _t = (k: string): string => k;

export const CANONICAL_CATEGORY_OTHER: string = _t('category.canonical.other');
export const CANONICAL_FIRST_EXPENSE_CATEGORY: string = _t('category.canonical.groceries');
/** Machine key for family shared expenses (display via t('family.txnCategory')). */
export const FAMILY_SHARED_CATEGORY_KEY = 'family_shared' as const;
