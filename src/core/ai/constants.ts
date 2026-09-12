import { t } from '../../i18n/engine';
import { CANONICAL_CATEGORY_OTHER } from '../categoryConstants';
import { CATEGORY_MAP } from '../categoryUtils';

export {
  CATEGORY_MAP,
  CATEGORY_ICONS,
  CATEGORY_COLORS,
  getCategoryIcon,
  getCategoryColor
} from '../categoryUtils';

export const CATEGORY_ALIASES: Record<string, string[]> = {
  groceries: ['groceries', 'مواد غذائية', 'بقالة', 'grocery', 'supermarket', 'سوبرماركت'],
  dining: ['dining', 'مطاعم', 'restaurant', 'restaurants', 'food', 'طعام', 'أكل'],
  cafe: ['cafe', 'coffee', 'مقاهي', 'مقهى', 'كافيه', 'قهوة'],
  transport: ['transport', 'مواصلات', 'fuel', 'بنزين', 'وقود', 'taxi', 'تاكسي', 'car', 'سيارة'],
  housing: ['housing', 'سكن', 'rent', 'إيجار', 'home', 'house', 'منزل', 'شقة'],
  shopping: ['shopping', 'تسوق', 'shop', 'clothes', 'ملابس', 'مشتريات'],
  entertainment: ['entertainment', 'ترفيه', 'games', 'ألعاب', 'fun', 'سينما', 'cinema'],
  health: ['health', 'صحة', 'medical', 'علاج', 'أدوية', 'صيدلية', 'pharmacy', 'doctor', 'طبيب'],
  education: ['education', 'تعليم', 'school', 'university', 'جامعة', 'مدرسة', 'course', 'دورة', 'كتب', 'books'],
  subscriptions: ['subscriptions', 'اشتراكات', 'subscription', 'streaming', 'خدمات', 'خدمة'],
  bills: ['bills', 'فواتير', 'utilities', 'electric', 'water', 'كهرباء', 'ماء', 'فاتورة', 'gas', 'غاز', 'internet', 'إنترنت'],
  salary: ['salary', 'راتب', 'income', 'دخل', 'مكافأة', 'bonus', 'paycheck'],
  transfer: ['transfer', 'تحويل', 'حوالة', 'تحويل بنكي', 'wire'],
  gifts: ['gifts', 'هدايا', 'gift', 'presents', 'هدية', 'تبرع', 'donation', 'صدقة'],
  invest: ['invest', 'استثمار', 'investment', 'stocks', 'أسهم', 'crypto', 'تداول', 'trading'],
  other: ['other', 'أخرى', 'miscellaneous', 'misc', 'عام', 'عامة', CANONICAL_CATEGORY_OTHER]
};

export const CHAT_TIP_ICONS = ['💡', '🔄', '🎯', '💰', '🏦', '📊', '🍽️', '🚗', '🛒', '📱', '⚖️'];

export const getLocalizedCategory = (id: string): string => t(`ai.cat.${id}`) || CATEGORY_MAP[id] || id;

// Map localized query keywords
export const getKeywords = (): Record<string, string | string[]> => ({
  'groceries': t('ai.cat.groceries'),
  'dining': t('ai.cat.dining'),
  'transport': t('ai.cat.transport'),
  'housing': t('ai.cat.housing'),
  'shopping': t('ai.cat.shopping'),
  'entertainment': t('ai.cat.ent'),
  'health': t('ai.cat.health'),
  'education': t('ai.cat.edu'),
  'subscriptions': t('ai.cat.subs'),
  'bills': t('ai.cat.bills'),
  'salary': t('ai.cat.salary'),
  'transfer': t('ai.cat.transfer'),
  'gifts': t('ai.cat.gifts'),
  'invest': t('ai.cat.invest'),
});
