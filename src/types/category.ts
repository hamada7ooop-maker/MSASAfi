/**
 * Represents a transaction category.
 */
export interface Category {
  id: string;
  name: string;
  nameEn?: string;
  icon: string;
  color: string;
  type: 'income' | 'expense' | 'both';
  order: number;
  isDefault?: boolean;
  isDemo?: number | boolean;
}
