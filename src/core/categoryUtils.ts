import { CANONICAL_CATEGORY_OTHER } from './categoryConstants';

export const CATEGORY_MAP: Record<string, string> = {
  'groceries': 'مواد غذائية',
  'dining': 'مطاعم',
  'transport': 'مواصلات',
  'housing': 'سكن',
  'shopping': 'تسوق',
  'entertainment': 'ترفيه',
  'health': 'صحة',
  'education': 'تعليم',
  'subscriptions': 'اشتراكات',
  'bills': 'فواتير',
  'salary': 'راتب',
  'transfer': 'تحويل',
  'gifts': 'هدايا',
  'invest': 'استثمار',
  'other': CANONICAL_CATEGORY_OTHER
};

export const CATEGORY_ICONS: Record<string, string> = {
  'groceries': '🛒',
  'dining': '🍽️',
  'transport': '🚗',
  'housing': '🏠',
  'shopping': '🛍️',
  'entertainment': '🎮',
  'health': '💊',
  'education': '📚',
  'subscriptions': '📱',
  'bills': '📄',
  'salary': '💵',
  'transfer': '🔄',
  'gifts': '🎁',
  'invest': '📈',
  'other': '📦'
};

export const CATEGORY_COLORS: Record<string, string> = {
  'groceries': '#10b981',
  'dining': '#f59e0b',
  'transport': '#3b82f6',
  'housing': '#6366f1',
  'shopping': '#ec4899',
  'entertainment': '#8b5cf6',
  'health': '#ef4444',
  'education': '#14b8a6',
  'subscriptions': '#06b6d4',
  'bills': '#f97316',
  'salary': '#22c55e',
  'transfer': '#64748b',
  'gifts': '#d946ef',
  'invest': '#0ea5e9',
  'other': '#94a3b8'
};

export function getCategoryIcon(cat?: string): string {
  if (!cat) return '📦';
  return CATEGORY_ICONS[cat.toLowerCase()] || '📦';
}

export function getCategoryColor(cat?: string): string {
  if (!cat) return '#94a3b8';
  return CATEGORY_COLORS[cat.toLowerCase()] || '#94a3b8';
}

import { t } from '../i18n/engine';

export function getRandomTip(): { text: string } {
  const maxTips = 189;
  const randomIndex = Math.floor(Math.random() * maxTips);
  return { text: t(`chat.tip.${randomIndex}`) };
}
