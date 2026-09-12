import { useI18n } from '@/i18n/index';
import { getCategoryIcon as getSmartIcon } from '@/core/categoryUtils';

/**
 * useCategory Hook - Provides category icons, colors, and labels.
 */
export function useCategory() {
  const { t } = useI18n();

  const getCategoryIcon = (category: string) => {
    return getSmartIcon(category);
  };

  const getCategoryIconClass = (category: string) => {
    const classMap: Record<string, string> = {
      'مواد غذائية': 'icon-food', 'مطاعم': 'icon-dining', 'مواصلات': 'icon-transport',
      'سكن': 'icon-housing', 'تسوق': 'icon-shopping', 'ترفيه': 'icon-entertain', 'صحة': 'icon-health',
      'تعليم': 'icon-education', 'اشتراكات': 'icon-subs', 'فواتير': 'icon-bills',
      'راتب': 'icon-salary', 'تحويل': 'icon-transfer', 'هدايا': 'icon-gifts',
      'استثمار': 'icon-invest', 'أخرى': 'icon-other', 'other': 'icon-other',
      family_shared: 'icon-family', 'مصاريف مشتركة': 'icon-family',
    };
    return classMap[category] || 'icon-other';
  };

  const formatCategoryLabel = (category: string) => {
    if (!category) return '';
    // Handle special categories
    if (category === 'family_shared' || category === '\u0645\u0635\u0627\u0631\u064a\u0641 \u0645\u0634\u062a\u0631\u0643\u0629') return t('family.txnCategory');
    // Try direct translation key e.g. category.groceries
    const directKey = `category.${category}`;
    if (t(directKey) !== directKey) return t(directKey);
    // Try the exact name as a translation key (for Arabic legacy names)
    const legacyKey = `category.${category.replace(/\s+/g, '_')}`;
    if (t(legacyKey) !== legacyKey) return t(legacyKey);
    // Return as-is if no translation found
    return category;
  };

  return { getCategoryIcon, getCategoryIconClass, formatCategoryLabel };
}
